

# Add "Skip for now" + resumable onboarding from Dashboard

Let users exit onboarding at any step after their organization exists, then resume from the dashboard with a single click. No new tables — onboarding completion is derived from existing data.

## What changes

### 1. "Skip for now" on every onboarding step (after org)

`src/pages/onboarding/OnboardingPage.tsx`

- Add a small **"Skip for now"** ghost link in the footer of each step card from `ownership` onward (`ownership`, `domain`, `testing`-failed, `intent`, `tenant`).
- Clicking it persists the **last step the user was on** to `localStorage` under `fabric59:onboarding:resumeStep` (so we can deep-link back), then `navigate("/admin")`.
- The `org` step has no skip — an organization is required to enter the app at all (this is already enforced by `ProtectedRoute`).

### 2. Resume support inside onboarding

- On mount, if `localStorage` has `fabric59:onboarding:resumeStep`, jump to that step instead of the default `ownership`.
- Clear the key when the user reaches `complete` or finishes a step naturally past the saved one.

### 3. "Resume setup" card on the Dashboard

`src/pages/admin/UserDashboardPage.tsx` (the page rendered by `OverviewPage`)

Add a dismissible **OnboardingResumeCard** at the top of the dashboard, shown only when onboarding is incomplete. "Incomplete" = any of:

- `organizations.five9_ownership_mode` is null
- No row in `five9_domains` for this org
- No row in `tenants` for this org

The card shows:
- Title: "Finish setting up Fabric59"
- A 4-item mini-checklist (Ownership · Five9 Domain · First Client · Ready) with check/circle icons reflecting current state
- Primary button **"Resume setup"** → `navigate("/onboarding")` (the page itself reads the resume hint and jumps to the right step)
- Secondary ghost button **"Hide for now"** → sets `localStorage` key `fabric59:onboarding:dismissed` (session-scoped reset on next login via `sessionStorage` instead, so it reappears next session)

### 4. New small component

`src/components/onboarding/OnboardingResumeCard.tsx` — self-contained: queries `organizations.five9_ownership_mode`, `five9_domains` count, `tenants` count for the active org, computes incompleteness, renders the checklist + actions. Returns `null` when complete or dismissed this session.

## Files

**New (1):**
- `src/components/onboarding/OnboardingResumeCard.tsx`

**Edited (2):**
- `src/pages/onboarding/OnboardingPage.tsx` — add "Skip for now" footer link to step cards from `ownership` onward; read/write `fabric59:onboarding:resumeStep` in localStorage
- `src/pages/admin/UserDashboardPage.tsx` — render `<OnboardingResumeCard />` at the top of the dashboard

**No DB changes, no migrations, no edge functions** — onboarding state is fully derivable from `organizations`, `five9_domains`, `tenants`.

## Acceptance

- On any onboarding step after `org`, a "Skip for now" link is visible and routes the user to `/admin`
- The dashboard shows a "Finish setting up Fabric59" card when ownership/domain/tenant is missing
- Clicking "Resume setup" returns the user to the exact step they skipped from
- Dismissing the card hides it for the rest of the session; it returns on next login
- When all three (ownership, domain, tenant) exist, the card no longer appears

