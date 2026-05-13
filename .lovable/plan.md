# Dashboard Surface Extraction Pass — Plan

## Objective

Produce one internal audit document that captures every dashboard-like surface a normal signed-in user can land on, what's actually on each, where every CTA goes, and where the duplicates are — so Phase 2 (client dashboard revamp) and Phase 3 (superadmin redesign) can act with full route truth.

No redesign. No backend, RLS, auth, or superadmin behavior changes. No route deletions.

## Deliverable

A single new file:

- `docs/dashboard-surface-extraction.md`

## Scope of surfaces audited

Confirmed or expected dashboard-like surfaces to verify from `src/App.tsx`, route config, and any surface inventory helpers:

```text
Canonical
  /admin                                  → OverviewPage             (org overview)
  /app/workspaces/:workspaceId            → redirect → /home
  /app/workspaces/:workspaceId/home       → WorkspaceHomePage        (workspace home)

Compatibility / redirect
  /dashboard                              → Navigate /admin
  /admin/dashboard                        → Navigate /admin
  /admindashboard                         → verify whether this exists as a compat alias / redirect
                                            target in current routing or only in historical notes
                                            (initial grep finds zero references in src/ or public/ —
                                            will confirm in the doc and mark as "not present")

Compatibility-only, de-surfaced from nav
  /admin/agent-dashboard                  → AgentDashboardPage

Adjacent overview-shaped surfaces flagged but not deeply extracted
  /admin/clients/:id                      → ClientOverviewPage       (per-client cockpit)
  /admin/clients/:id/workspace            → ClientWorkspacePage = ClientOverviewPage
  /admin/partners/:id                     → PartnerOverviewPage
  /admin/five9                            → Five9OverviewPage
  /admin/legal-connect/overview           → LegalConnectOverviewPage
  /admin/supervisor                       → SupervisorPage
  /superadmin                             → SuperadminOverviewPage   (out of scope — note only)
```

Verification step in the doc: grep for `dashboard`, `overview`, `home`, `cockpit` page files and reconcile against `src/data/surfaceAudit.ts` so nothing extra is missed; add anything found.

## Document structure

`docs/dashboard-surface-extraction.md` will follow the required reply order:

### 1. Dashboard route inventory

Table: route · component file · visible heading · scope (org / workspace / compat / agent / other) · canonical vs compat · in nav? · redirects? · redirect target · notes.

### 2. Canonical vs compatibility truth

Restatement of the canonical map plus compat redirects, sourced from `App.tsx` route comments and `src/data/surfaceAudit.ts`. No new claims.

### 3. `/admin` (Org Overview) — full extraction

For `OverviewPage` (`src/pages/admin/OverviewPage.tsx`):

- shell/framing: icon, title `{organization?.name || "Organization Overview"}`, subtitle, no breadcrumb, no tabs, no top-right actions
- KPI / stat cards: none on the page directly — any KPIs render inside `SystemHealthStrip`
- sections in render order:
  1. `SystemHealthStrip`
  2. `QuickActionsGrid` (org variant)
  3. `WorkspaceSnapshotPanel`
  4. `ConnectorsReportsPanel`
  5. `ReadinessChecklist` ("Setup Progress")
  6. `AIGuidanceCard`
  7. `OnboardingResumeCard`
- per section: file path, hooks/props, data source (real query / hard-coded / mock / mixed), empty/loading state, copy
- CTA table for `QuickActionsGrid` org variant: View workspaces → `/admin/workspaces`, Open connectors → `/admin/connectors`, View reports → `/admin/reports`, Open docs → `/admin/docs` (all canonical, org-scope)
- CTA table for `AIGuidanceCard` (from `getNextActions(readiness)`) — every emitted href captured
- Note: readiness is derived from the first `tenants` row by `organization_id` — flag as "org overview is using a single-tenant readiness as a stand-in"

### 4. `/app/workspaces/:id/home` (Workspace Home) — full extraction

For `WorkspaceHomePage` (`src/pages/workspace/WorkspaceHomePage.tsx`):

- shell: "Canonical" outline badge, title = `workspace.name`, subtitle, no tabs, no KPI strip, no readiness, no AI guidance
- single section: nav-card grid generated from `SURFACED_WORKSPACE_SECTIONS` (`src/config/navigation.ts`) minus `home`
- per-card extraction: label, icon, destination `/app/workspaces/:id/{href}`
- data: zero queries — pure nav scaffold
- explicit gap list vs `/admin`: no metrics, no readiness, no AI guidance, no system health, no quick actions for create/connect/test, no resume-onboarding card

### 5. `/admin/agent-dashboard` (Legacy Agent Dashboard) — full extraction

For `AgentDashboardPage`:

- header: "Agent Dashboard" + subtitle
- KPI strip (4 `PremiumStatCard`): Calls Today, Avg Handle Time, Tasks Pending, Sessions
- Tabs: Overview, Tasks (badge), Notes, Callbacks, AI Assist
- Overview tab sections: Task Queue, Recent Sessions, Calls by Hour, My Goals, Training Modules
- per-section: data hooks (`useTasks`, `useScriptSessions`, `useTrainingModules`, `usePerformanceGoals`, `useTrainingProgress`), empty states, mocked vs real (e.g. `MOCK_HOURLY` partly synthetic)
- duplication call-outs vs `/admin` and `/app/workspaces/:id/home`
- unique content worth preserving: agent task queue, callbacks, AI node suggestions, training progress — flagged as future workspace `/agents` content, not org overview content

### 6. CTA destination audit

Single table across all three surfaces. Columns: source surface · CTA label · destination · canonical / compat / redirecting / stale · scope correctness (org vs workspace).

Specifically capture:

- `OverviewPage` → `/admin/workspaces`, `/admin/connectors`, `/admin/reports`, `/admin/docs` plus dynamic `AIGuidanceCard` hrefs
- `WorkspaceHomePage` → every `SURFACED_WORKSPACE_SECTIONS` href under `/app/workspaces/:id/...`
- `AgentDashboardPage` → no outbound page CTAs from the page itself; sub-panels (`TaskQueuePanel`, `CallbackRemindersPanel`, `AINodeSuggestions`) audited inline

Flag any href that points at a redirect or stale target.

### 7. Dashboard overlap matrix

Two-axis matrix: concept × surface (Org Overview / Workspace Home / Agent Dashboard). Concepts: KPIs, system health, readiness, AI guidance, quick actions, workspace list, connectors snapshot, reports snapshot, onboarding resume, task queue, callbacks, training, recent sessions, goals, calls-by-hour.

Per cell: present / partial / absent + short note. Followed by:

- "Should live only on Org Overview"
- "Should live only on Workspace Home"
- "Should live on a future workspace Agent surface, not on either dashboard"
- "Remove entirely / fold into a section page"

### 8. Recommended canonical split (recommendation only — not implemented this pass)

Three buckets:

- Org Overview (`/admin`): org-wide health, workspace snapshot, connectors+reports snapshot, org-level quick actions, onboarding resume. Drop single-tenant readiness as a stand-in; readiness belongs per-client.
- Workspace Home (`/app/workspaces/:id/home`): workspace-scoped KPIs, workspace readiness, workspace quick actions, workspace AI guidance, recent activity. Currently empty — biggest revamp target in Phase 2.
- Agent Dashboard (legacy `/admin/agent-dashboard`): redirect target should become `/app/workspaces/:id/agents` (per outline). Unique content (tasks, callbacks, AI assist, training) migrates into that workspace surface, not into either dashboard.

### 9. Superadmin implications (noted, not implemented)

- `/superadmin` overview overlaps conceptually with org overview and should get its own extraction in Phase 3
- `AdvancedRoutesPage` and related superadmin inventory pages should be checked for references to compatibility-only dashboard surfaces
- org/admin gating and role-routing behavior should be re-checked during the superadmin pass, but not changed in this extraction pass

## What I will NOT do in this pass

- No edits to `OverviewPage`, `WorkspaceHomePage`, `AgentDashboardPage`, navigation config, redirects, or any component
- No DB, RLS, edge function, auth, or superadmin changes
- No route deletions or new redirects
- No invented metrics or normalized copy — capture exactly what is on the page today

## Reply format after implementation

When the doc is written I will reply in the exact 9-section structure the brief specifies (dashboard routes found → … → superadmin issues observed for later → files created or updated).
