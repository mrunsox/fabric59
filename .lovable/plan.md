## Problem

Visiting `/login` while already signed in redirects to `/launch`, which then sends users with no orgs straight to `/onboarding`. For `pauljoseph@24hvirtual.com` and `dev@unsox.com` the in-page Skip control isn't enough — they need a deterministic path out of `/onboarding` even when `isMasterAdmin` hasn't resolved or no workspace exists yet.

## Fix (frontend only, no business logic / DB changes)

Introduce a single shared constant and use it in three routing chokepoints.

### 1. `src/lib/superadmin-emails.ts` (new)
Export `SUPERADMIN_SKIP_EMAILS = ["pauljoseph@24hvirtual.com", "dev@unsox.com"]` and a helper `isSuperadminSkipEmail(email?: string | null)` that lowercases + checks membership.

### 2. `src/pages/auth/LaunchRedirectPage.tsx`
After the `!isAuthenticated` branch, before the existing org/workspace logic:
- If `isSuperadminSkipEmail(user?.email)`, `navigate("/superadmin", { replace: true })` and return.

This guarantees these two emails always land on `/superadmin` from `/launch`, regardless of org/workspace state.

### 3. `src/pages/auth/LoginPage.tsx`
Replace the unconditional `<Navigate to="/launch" replace />` for already-authenticated users with: if `isSuperadminSkipEmail(user?.email)`, navigate to `/superadmin` instead of `/launch`. Other authenticated users still go through `/launch` as today.

### 4. `src/pages/onboarding/OnboardingPage.tsx`
- Replace the inline email array in the Skip-controls visibility check with `isSuperadminSkipEmail(user?.email)`.
- Add an early `useEffect` that, once `user` is loaded, if `isSuperadminSkipEmail(user.email)` and the user lands on `/onboarding`, calls `navigate("/superadmin", { replace: true })`. This is the deterministic "skip" the user is asking for — they never get stuck on onboarding again.

## Out of scope
- No changes to `AuthContext`, master-admin resolution, RBAC, RLS, or DB.
- No changes to `handleSkipToWorkspace` semantics.
- No new routes.

## Verification
- Sign in as `pauljoseph@24hvirtual.com` or `dev@unsox.com` → land on `/superadmin` regardless of org/workspace state. Visiting `/login` or `/onboarding` while signed in also lands on `/superadmin`.
- Sign in as a normal user with no orgs → still routed to `/onboarding` as before.
- Master admins keep current behavior (Skip controls remain visible on `/onboarding`).
