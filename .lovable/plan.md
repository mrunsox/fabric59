## Problem

Clicking **Skip onboarding for now** on `/onboarding` throws:

> new row violates row-level security policy for table "workspaces"

Both the master-admin "Skip onboarding — go to workspace dashboard" link and the non-master "Skip onboarding for now" link call the same `handleSkipToWorkspace`, which always tries to `INSERT` into `public.workspaces`. The RLS policy `workspaces insertable by org owners/admins` requires the user to be `is_master_admin` or `is_org_owner_or_admin` for the target org. Regular org members (the people the "Skip for now" link is shown to) fail that check, so the insert is rejected.

The non-master skip link should never create rows — it should just bail out of the concierge flow.

## Fix

In `src/pages/onboarding/OnboardingPage.tsx`, add a second handler `handleSkipForNow` used only by the non-master "Skip onboarding for now" button. It does not write to the DB:

1. Clear the `RESUME_KEY` from `localStorage`.
2. If `workspaces` already contains at least one workspace the user can see (RLS guarantees it's one they're a member of), navigate to `/w/${ws.id}/campaigns` (prefer `is_default`, otherwise first).
3. Otherwise navigate to `/launch`, which is the canonical post-auth resolver and will route them appropriately without needing onboarding to seed anything.
4. Wrap in try/catch and use a hard `window.location.assign` for the final navigation so AuthContext/WorkspaceContext re-bootstrap cleanly (matches the master-admin path's pattern).

Wire the non-master button at line ~629 to `handleSkipForNow` instead of `handleSkipToWorkspace`. The master-admin path (which legitimately may need to create the first workspace) keeps using `handleSkipToWorkspace` unchanged.

## Files

- `src/pages/onboarding/OnboardingPage.tsx` — add `handleSkipForNow`, swap the onClick for the `onboarding-skip-for-now` button.

No DB or RLS changes needed.
