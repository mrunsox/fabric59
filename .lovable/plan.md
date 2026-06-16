## What's actually happening

You're not being routed wrong by the marketing site — the "Sign in" link in `MarketingShell` / `HomePage` does point at `/login`. The problem is downstream:

1. You already have a persisted auth session (Supabase remembers you).
2. `LoginPage` (`src/pages/auth/LoginPage.tsx`, lines 33–39) sees `isAuthenticated === true` and does `<Navigate to="/launch" replace />` *before ever rendering the login form*.
3. `LaunchRedirectPage` sees you have **no organization and no workspace**, so it sends you to `/onboarding`.
4. `OnboardingPage` has **no sign-out button**, so there's no way to escape back to a real login screen.

Net effect: every attempt to "go to login" silently lands on `/onboarding` with no way out. That's the dead end.

## Fix

Frontend-only, no schema/RLS/config changes.

### 1. `src/pages/auth/LoginPage.tsx` — stop auto-bouncing
Replace the unconditional `<Navigate to="/launch">` for authenticated users with a small interstitial:

- If `isAuthenticated` and the URL has `?continue=1`, then (and only then) redirect through `/launch` as today. This preserves the post-signin redirect path (the form itself will set `?continue=1` on success).
- Otherwise render an "Already signed in as `user.email`" panel inside `AuthShell` with two buttons:
  - **Continue** → navigate to `/launch` (preserving `?invite=` if present).
  - **Sign out and use a different account** → call `signOut()`, then stay on `/login` so the form renders.
- On successful `signIn(...)` submit, navigate to `/launch?continue=1` (or forward `invite`) so the redirect to the workspace still happens for a fresh sign-in.
- Superadmin-skip behavior is preserved (still routes to `/superadmin` on Continue).

### 2. `src/pages/onboarding/OnboardingPage.tsx` — visible escape hatch
Add a small top-right header action: "Signed in as `user.email` · Sign out". Clicking calls `signOut()` and navigates to `/login`. This breaks the trap for any user (including master admins with no org) who ends up parked on `/onboarding`.

### 3. `src/pages/auth/LaunchRedirectPage.tsx` — no behavior change required
Already correct. Once #1 and #2 are in place, users can reach `/login` deliberately and can leave `/onboarding` without dev-tools.

### 4. Regression tests
Extend `src/test/regressions/authRoutingFallOffs.test.tsx`:

- Authenticated user visiting `/login` *without* `?continue=1` sees the "Already signed in" interstitial (no redirect).
- Authenticated user visiting `/login?continue=1` still redirects to `/launch`.
- Clicking "Sign out" on the interstitial calls `signOut` and renders the login form.
- `OnboardingPage` renders a sign-out control that calls `signOut` and navigates to `/login`.

## Out of scope

- No changes to `ProtectedRoute`, `AuthContext`, RLS, generated types, `client.ts`, `.env`, or `supabase/config.toml`.
- No change to the marketing "Sign in" link target (already `/login`).
- No change to the `/launch` decision matrix.

## Verification gates

- All existing 386 tests stay green; 4 new regressions added above pass.
- Manual: when signed in with no org, visiting `/login` shows the interstitial; "Sign out" returns you to the login form; submitting credentials lands you back through `/launch`.
