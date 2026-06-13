# Fabric59 — Critical-Path UX + Accessibility (WCAG AA) Audit

Branch: `audit/full-ux-a11y-pass` (from origin/main `9942460`)
Date: 2026-06-13
Scope: critical-path surfaces only (auth, onboarding, workspace shell, campaigns, guide, guides, flow builder, forms, live call runner, settings/notifications/billing/clients).

Severity key: **P0** = broken flow or WCAG AA violation blocking use · **P1** = visible rough edge / missing CTA / missing state-or-toast · **P2** = consistency polish.

Each finding marked `[SHIPPED]` or `[DEFERRED]`.

---

## Onboarding & auth (`/auth/*`, `/onboarding/*`)

### Finding: Auth error blocks are not announced to screen readers — P0 [SHIPPED]
Location: `src/pages/auth/LoginPage.tsx:58-62`, `src/pages/auth/SignupPage.tsx:67-71`
Problem: Sign-in/sign-up error messages render in a `<div>` with no live region, so AT users get no feedback when auth fails.
Fix: Add `role="alert"` to the error container so the message is announced.

### Finding: Onboarding selection cards don't expose selected state to AT — P0 [SHIPPED]
Location: `src/pages/onboarding/OnboardingPage.tsx:364, 401, 434`
Problem: Role / ownership / motion pickers are `<button>`s whose "selected" state is conveyed only by border color + a check icon. No `aria-pressed`, so screen-reader users can't tell what's chosen.
Fix: Add `aria-pressed={active}` to each toggle button.

### Finding: Password-reveal toggle is icon-only and keyboard-unreachable — P1 [SHIPPED]
Location: `src/pages/onboarding/OnboardingPage.tsx:504-513`
Problem: The eye/eye-off button has no accessible name and `tabIndex={-1}` removes it from tab order.
Fix: Add `aria-label` ("Show/Hide password") and `aria-pressed`; keep it focusable (drop `tabIndex={-1}`).

### Finding: LoginPage/SignupPage — clean otherwise — (informational)
Labels, autocomplete, loading spinner, disabled-on-submit all present. No action.

---

## Workspace shell (`/w/:workspaceId`)

### Finding: Loading state is plain text with no busy semantics — P2 [SHIPPED]
Location: `src/shells/WorkspaceShell.tsx:273-274`
Problem: "Loading workspace…" is a bare `<div>`; no `role="status"`/`aria-busy`.
Fix: Wrap in `role="status"`.
Note: Shell otherwise strong — `<main>`, `<nav aria-label="Breadcrumb">`, command palette, workspace-not-found recovery card all present.

---

## Campaign list (`/w/:workspaceId/campaigns`)

### Finding: Row "open" link is icon-only with no accessible name — P0 [SHIPPED]
Location: `src/pages/workspace/WorkspaceCampaignsPage.tsx:104-107`
Problem: trailing `ArrowRight` link announces as a bare "link".
Fix: `aria-label={`Open ${c.name}`}`.

### Finding: Table headers lack `scope="col"` — P1 [SHIPPED]
Location: `src/pages/workspace/WorkspaceCampaignsPage.tsx:78-86`
Fix: add `scope="col"` to each `<TableHead>`.

### Finding: Raw `source_type` token shown to users — P2 [SHIPPED]
Location: `WorkspaceCampaignsPage.tsx:99`, `WorkspaceCampaignDetailPage.tsx:105`
Fix: humanize via `prettifyKey`.

---

## Campaign create (`/w/:workspaceId/campaigns/new`)

### Finding: console.info ships to prod (AI-handoff observability) — P2 [DEFERRED]
Location: `src/pages/workspace/WorkspaceCampaignNewPage.tsx:42-46`
Problem: Intentional, eslint-disabled dev observability log. Low user impact; removing risks the `aiBlueprintHandoff` regression test. Left as-is intentionally.

---

## Campaign detail (`/w/:workspaceId/campaigns/:campaignId`)

### Finding: "Phase 3 note" dev card leaks roadmap + raw table name into UI — P0 [SHIPPED]
Location: `src/pages/workspace/WorkspaceCampaignDetailPage.tsx:114-122`
Problem: A user-visible card titled "Phase 3 note" describes internal phasing and references the raw `campaigns` table.
Fix: Remove the card entirely.

### Finding: Intake-form Select has no accessible name — P1 [SHIPPED]
Location: `WorkspaceCampaignDetailPage.tsx:150-157`
Fix: `aria-label="Intake form"` on the `SelectTrigger`.

### Finding: Plain-text loading — P2 [SHIPPED]
Location: `WorkspaceCampaignDetailPage.tsx:31`
Fix: wrap in `role="status"`.

---

## Flow builder (`/w/:workspaceId/campaigns/:campaignId/builder`)

### Finding: builder otherwise OK — (informational)
shadcn Dialog/Dropdown used; StepList icon buttons carry `aria-label`; titles truncate. No structural change made (risk of conflict w/ Lovable). Plain-text loading wrapped in `role="status"`. [SHIPPED — loading only]

---

## Firm guide editor (`/w/:workspaceId/guide`) & Guide library (`/guides`)

### Finding: Plain-text loading on guide editor + list — P2 [SHIPPED]
Location: `WorkspaceGuideBuilderPage.tsx:79`, `WorkspaceGuidesPage.tsx:31`
Fix: `role="status"`.
Note: Guide save/publish toasts fire at the hook level (verified). StatusBadge is text+icon, not color-only.

### Finding: Guide list card title not truncated — P2 [SHIPPED]
Location: `WorkspaceGuidesPage.tsx` card title
Fix: `truncate` + `title`.

---

## Intake form builder (`/w/:workspaceId/forms/:formId/builder`)

### Finding: Save draft succeeds with NO success toast — P1 [SHIPPED]
Location: `src/pages/workspace/WorkspaceFormBuilderPage.tsx:119-122`; hook `useWorkspaceForms.ts:125-129` (updateSchema has only `onError`)
Problem: After "Save draft", nothing confirms success — user can't tell it worked.
Fix: add `toast.success("Draft saved")` in the page's `saveDraft`.

### Finding: Icon-only / placeholder-only controls unlabeled — P1 [SHIPPED]
Location: `WorkspaceFormBuilderPage.tsx` add-section, delete-section (Trash2), section-title input, change-notes input
Fix: add `aria-label` to each.

### Finding: No error/not-found branch — perpetual "Loading form…" — P2 [DEFERRED]
Location: `WorkspaceFormBuilderPage.tsx:53-55`
Problem: If the form fails to load, the page spins forever. Lower priority — needs an error branch + retry CTA; left for a follow-up to keep this PR surgical.

---

## Forms list (`/w/:workspaceId/forms`)

### Finding: Card title not truncated + plain-text loading — P2 [SHIPPED]
Location: `WorkspaceFormsPage.tsx`
Fix: `truncate`+`title`; wrap loading in `role="status"`.

---

## Live call runner (`/app/agent/workspace/:workspaceId/:campaignId`)

### Finding: Active step's script line is not announced to screen readers — P0 [SHIPPED]
Location: `src/components/call-runner/FlowPanel.tsx:261-265`
Problem: Per WCAG + the explicit requirement, the line the agent must read aloud changes silently — no live region. SR users (or SR-using agents) get no announcement when the active step changes.
Fix: Wrap the active script line in `aria-live="polite"` / `role="status"` (polish only, no structural change to the runner).

### Finding: field_capture leaks raw `fieldKey` + input not associated with label/error — P1 [SHIPPED]
Location: `FlowPanel.tsx:451-454, 491-509`
Problem: Label falls back to raw `cfg.fieldKey` (snake_case leak); the Label isn't tied to the input via `htmlFor`/`id`; the error message (line 509) isn't linked via `aria-describedby`/`aria-invalid`.
Fix: humanize the fallback with `prettifyKey`, associate label+input with an id, add `aria-invalid`/`aria-describedby` for errors.

### Finding: Runner page has no `<main>` landmark — P2 [SHIPPED]
Location: `src/pages/agent/LiveCallRunnerPage.tsx:158`
Fix: add `role="main"` / `aria-label` to the runner root (non-structural).

### Finding: Guide filter input has no accessible name — P2 [SHIPPED]
Location: `src/components/call-runner/GuidePanel.tsx:80-87`
Fix: `aria-label="Filter guide sections"`.

---

## Settings (`/w/:workspaceId/settings`)

### Finding: Raw `<a href>` links cause full page reloads — P2 [DEFERRED]
Location: `WorkspaceSettingsPage.tsx:99-101`
Problem: In-app navigation uses `<a href>` not `<Link>`, forcing a full reload. Minor; deferred to avoid touching settings plumbing Lovable may be editing.

---

## Notifications (`/w/:workspaceId/notifications`)

### Finding: Raw field-key leak `trigger_event` — P1 [SHIPPED]
Location: `src/pages/workspace/WorkspaceNotificationsPage.tsx:98`
Problem: snake_case event keys (e.g. `call_completed`) shown raw.
Fix: humanize via `prettifyKey`.

### Finding: Table headers lack `scope="col"` — P1 [SHIPPED]
Location: `WorkspaceNotificationsPage.tsx:81-85`
Fix: add `scope="col"`.

---

## Billing (`/w/:workspaceId/billing`)

### Finding: Roadmap/dev copy leaks into production UI — P2 [SHIPPED]
Location: `src/pages/workspace/WorkspaceBillingPage.tsx:33, 41-45`
Problem: Copy reads as internal phasing ("Subscription plumbing lands in a follow-up phase", "deferred to a later slice").
Fix: Reword to customer-facing copy that states current capability without exposing roadmap/phase language.

### Finding: Permanently-disabled "Export" button with no explanation — P2 [DEFERRED]
Location: `WorkspaceBillingPage.tsx` export button
Problem: Disabled with no `aria-disabled`/tooltip. Low impact; deferred.

---

## Clients (`/w/:workspaceId/clients`)

### Finding: (agent-flagged "dead nav" — FALSE POSITIVE, verified)
Location: `WorkspaceClientsPage.tsx:46`
A sub-agent flagged row links to a non-existent route. VERIFIED FALSE: route `clients/:clientId` → `WorkspaceClientDetailPage` exists (`App.tsx:572`). Only the stale code comment (lines 16-17) is misleading.
Fix: update the stale comment to reflect that detail surfaces now ship. — P2 [SHIPPED]

### Finding: Empty state has no primary CTA — P2 [DEFERRED]
Location: `WorkspaceClientsPage.tsx:37-42`
Problem: Clients are created at org level; there's intentionally no in-workspace "create client" action. Honest empty-state copy already explains this. Adding a CTA would create a new surface (out of scope per constraints). Deferred by design.

---

## Cross-cutting

### Finding: Inconsistent loading pattern (ad-hoc `<p>Loading…</p>`) — P2 [PARTIAL/SHIPPED]
Every workspace page uses bare text loaders rather than Skeleton. Full skeletonization is a large, Lovable-conflicting change; instead added `role="status"` to the loaders touched in this pass so they're at least announced. Full Skeleton rollout deferred.

### Finding: Toast live-region — OK (informational)
sonner `<Toaster>` is mounted at app root (`App.tsx:288`) and provides `aria-live` by default. No action.

### Finding: Terminology — OK (informational)
No Tenant/Customer/Account drift found in user-facing critical-path copy; "Client" used consistently.
