# Fix: Login / Signup / Onboarding routing fall-offs

I traced every entry point (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/launch`, `/onboarding`) through `AuthContext`, `ProtectedRoute`, `LaunchRedirectPage`, and `OnboardingPage`. Several concrete dead ends and loops exist. All fixes are frontend-only — no schema, RLS, generated types, `client.ts`, `.env`, or `supabase/config.toml` changes.

## Issues found

1. **Loop after concierge "Land workspace"** (`OnboardingPage.handleLandWorkspace`, line 223–256). It creates the workspace and navigates to `/w/:id/campaigns`, but never calls `refreshOrganizations()`. If the org was created earlier in the same session (`createdOrgId` path), `AuthContext.organization` is still `null`, so `ProtectedRoute` (line 25) bounces the user straight back to `/onboarding`. The "skip to workspace" path already does this correctly — `land` does not.

2. **Loop in "Skip onboarding for now"** (`handleSkipForNow`, line 325). When the user has an org but no workspace, it navigates to `/launch`. `/launch` sees "org exists, no workspace" and redirects to `/onboarding`. Infinite ping-pong.

3. **`ProtectedRoute` master-admin comment vs. code mismatch** (line 22–26). Comment says "Master admins are exempt — they can access /admin without an org," but the guard only checks `!organization`. A master admin with zero orgs hitting `/admin` directly is redirected to `/onboarding` instead of being allowed through (or routed to `/superadmin`).

4. **Signup org-insert race when email confirmation is required**. `AuthContext.signUp` (line 241–262) calls `supabase.auth.signUp` then immediately inserts into `organizations` + `organization_members`. With auto-confirm off, `signUp` returns no session, RLS denies the insert, the user account is left orphaned with no org, and the surfaced error is opaque ("permission denied"). Today auto-confirm is on so it works, but the flow is fragile and the error is unhelpful. Fix: detect "no session returned" and surface a clear "Check your email to confirm, then sign in" state instead of attempting the org insert.

5. **`AcceptInvitePage` is a true dead end for tokenized links**. The page forwards `?invite=…` through `/launch` / `/signup` / `/login`, but no downstream code actually consumes it — the token is just appended to URLs. A real recipient clicking an invite link lands in onboarding with no membership being created. Fix (scoped, no backend change): when an authenticated user lands at `/accept-invite?token=…` and the token is unknown to the client, show an explicit "Invite acceptance is not yet wired — ask your admin to add you from the in-app dialog" state instead of silently routing to `/launch`. This converts a silent dead end into an explainable terminal state.

6. **Stale `RESUME_KEY` cross-user contamination**. `localStorage["fabric59:onboarding:step"]` is global. If user A reaches step `telephony`, signs out, and user B signs up on the same machine, B resumes mid-flow with A's progress. Fix: namespace the key by `user.id`, and clear it on `signOut`.

## Changes

### `src/components/auth/ProtectedRoute.tsx`
- Exempt master admins from the no-org redirect; route them to `/superadmin` instead of `/onboarding` when they have no org and aren't already on an admin/superadmin path.

### `src/pages/onboarding/OnboardingPage.tsx`
- `handleLandWorkspace`: call `await refreshOrganizations()` after the workspace insert and before navigating, mirroring the `handleSkipToWorkspace` pattern. Use `window.location.assign` for the final navigation so `AuthContext` + `WorkspaceContext` rebootstrap cleanly with the new org/workspace (same guarantee already used by skip-to-workspace).
- `handleSkipForNow`: when no existing workspace is found, stop sending the user through `/launch` (which loops back). Instead, stay on `/onboarding` and surface a toast: "Finish the workspace step to continue, or ask your admin to add you to one."
- `RESUME_KEY`: derive as `fabric59:onboarding:step:${user.id}` to scope per user. Read/write/remove using the namespaced key.

### `src/contexts/AuthContext.tsx`
- `signUp`: if `authData.session` is null after `supabase.auth.signUp`, return `{ error: new Error("Check your email to confirm your account, then sign in.") }` *without* attempting the org/member insert. Keeps the auth row clean and gives an actionable message. When a session is present, behavior is unchanged.
- `signOut`: also clear `fabric59:onboarding:step` and `fabric59:onboarding:profile` from `localStorage`.

### `src/pages/auth/AcceptInvitePage.tsx`
- When `?token=…` is present and the user is authenticated, render a clear terminal "Invite acceptance is not yet wired" message + a "Continue to your workspace" button (routes to `/launch`). Unauthenticated path is unchanged.

### `src/test/regressions/launchRedirectMatrix.test.tsx`
- Extend existing suite with three cases:
  1. `ProtectedRoute` with `isMasterAdmin=true, organization=null` does NOT redirect to `/onboarding`.
  2. `OnboardingPage.handleSkipForNow` with `workspaces=[]` stays on `/onboarding` (does not navigate to `/launch`).
  3. `AuthContext.signUp` with no returned session surfaces the "Check your email" error and does not insert into `organizations`.

## Out of scope (intentional)

- No changes to Supabase auth settings, providers, or `config.toml`.
- No edits to `client.ts`, generated types, `.env`, or RLS.
- No real implementation of tokenized invite acceptance — that needs a server-side `accept-invite` edge function and is a separate phase. This pass only converts the silent fall-off into an honest terminal state.
- No changes to `LaunchRedirectPage` matrix itself — it's correct; the bugs were upstream/downstream of it.

## Verification

- All existing 372 regression tests stay green.
- New cases above pass.
- Manual matrix:
  - Fresh signup → `/launch` → `/onboarding` (profile) → telephony → land → `/w/:id/campaigns` (no loop).
  - Master admin, no org, hits `/admin` → no `/onboarding` bounce.
  - User with org + no workspace clicks "Skip for now" → stays on `/onboarding` with toast (no `/launch` ↔ `/onboarding` loop).
  - Two users on same browser don't see each other's onboarding step.
