## Goal
Always show the existing "Skip onboarding" + "Open Superadmin" controls on `/onboarding` for two specific accounts, regardless of whether they currently resolve as master admin.

- `pauljoseph@24hvirtual.com`
- `dev@unsox.com`

## Approach
The skip UI already exists in `src/pages/onboarding/OnboardingPage.tsx` (lines 592–615) and is gated by `isMasterAdmin` from `AuthContext`. We extend that single gate so the two listed emails also see it.

## Changes
1. `src/pages/onboarding/OnboardingPage.tsx`
   - Add a small constant `SUPERADMIN_SKIP_EMAILS = ["pauljoseph@24hvirtual.com", "dev@unsox.com"]`.
   - Derive `canSkipOnboarding = isMasterAdmin || (user?.email && SUPERADMIN_SKIP_EMAILS.includes(user.email.toLowerCase()))`.
   - Replace the `{isMasterAdmin && (...)}` block with `{canSkipOnboarding && (...)}`. No other UI/behavior changes.

## Out of scope
- No change to `AuthContext` / master-admin resolution.
- No new routes, RBAC, or DB changes.
- Skip action itself (`handleSkipToWorkspace`) is unchanged — same destination and behavior as today's master-admin skip.

## Verification
- Log in as either listed email → "/onboarding" shows the Skip + Superadmin links.
- Log in as a normal user → links remain hidden.
- Master admins continue to see the links as before.