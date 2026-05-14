## Problem

Clicking "Skip onboarding" successfully creates the org + workspace in the database (verified — 2 orgs and 2 default workspaces now exist for `pauljoseph@24hvirtual.com`) and calls `navigate("/w/:id/home")`. But the page lands back on `/onboarding`.

**Root cause:** `AuthContext` only loads `organization` once at sign-in. After `Skip onboarding` inserts the new org, `AuthContext.organization` is still `null`. When React Router navigates to `/w/:id/home`, `ProtectedRoute` sees `!organization` and bounces back to `/onboarding`. Same thing for `WorkspaceContext` — its workspace list is stale, so even if it loaded, the new workspace might not be visible to `CanonicalWorkspaceShell`.

`AuthContext` exposes no `refresh()`, so the skip handler has no way to re-trigger the org load before navigating.

## Fix (surgical, two files)

### 1. `src/contexts/AuthContext.tsx`
Expose a `refreshOrganizations()` function on the context:
- Extract the existing `loadOrganizations(userId)` so it can be called on demand.
- Add `refreshOrganizations: () => Promise<void>` to `AuthContextType` and the provider value, which calls `loadOrganizations(user.id)` if `user` exists.

No behavior change for any existing consumer.

### 2. `src/pages/onboarding/OnboardingPage.tsx` — `handleSkipToWorkspace`
After the org + workspace inserts succeed, before `navigate(...)`:
- `await refreshOrganizations()` (from `useAuth()`)
- `await refetchWorkspaces()` (already called)
- Persist `localStorage.setItem("currentOrgId", targetOrgId)` so AuthContext picks the right org on the next load.
- Then `navigate(`/w/${targetId}/home`, { replace: true })`.

Fallback safety net: if for any reason `organization` is still null right after refresh (race), use `window.location.assign(`/w/${targetId}/home`)` instead of `navigate(...)` so the app re-bootstraps cleanly. This guarantees the user lands on the workspace dashboard.

### 3. Optional cleanup (does not block fix)
Two stub orgs named "Fabric59 Ops" exist from the failed attempts. Not deleting in this pass — the user can rename one and the other becomes a harmless duplicate. We can prompt to clean up after this fix lands if desired.

## Acceptance

1. On `/onboarding`, master admin clicks "Skip onboarding — go to workspace dashboard".
2. Toast shows "Workspace ready".
3. URL changes to `/w/<workspace-id>/home` and the workspace cockpit renders (no bounce back to `/onboarding`).
4. Refreshing the page stays on `/w/<id>/home`.

## Out of scope

- No changes to `LaunchRedirectPage`, route table, or `WorkspaceResolveRedirect`.
- No RLS or schema changes.
- No deletion of duplicate "Fabric59 Ops" orgs (separate cleanup).
