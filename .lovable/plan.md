## Add subtle "Skip onboarding" link to /onboarding

Add a small, low-emphasis text button under the OnboardingShell body that lets the user bail out of the concierge flow.

### Where
`src/pages/onboarding/OnboardingPage.tsx` — pass a `footer` prop to `<OnboardingShell>` (the shell already renders a `footer` slot beneath the step body).

### Behavior
- Label: "Skip onboarding for now"
- Style: muted, underline-on-hover, ghost button — visually subtle, not a primary CTA
- On click:
  - Clear the resume key (`localStorage.removeItem("fabric59:onboarding:step")`)
  - If an organization already exists and a target workspace can be resolved (same path used by the "land" step), navigate to `/w/:id/home`
  - Otherwise navigate to `/admin` so the user lands somewhere honest instead of a blank state
- Hidden on the final "land" step (nothing left to skip)

### Out of scope
- No changes to `OnboardingShell`, step definitions, or any other page
- No DB / auth / routing config changes
- No new persistence key
