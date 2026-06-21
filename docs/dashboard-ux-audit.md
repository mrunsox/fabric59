# Dashboard UX Audit — Logged-in Workspace

Program: **Dashboard Consolidation + UX Reset** — Phase 0 (Audit & Blueprint).
Scope: every operational surface under `/w/:workspaceId/*`, plus the workspace
index, admin overlay surfaces that operators encounter, and the demoted/legacy
routes still mounted. Read-only audit — no JSX, route, schema, or nav changes.

Companion docs:
- `docs/dashboard-ia-reset-plan.md` — proposed canonical IA and phased roadmap.
- `docs/business-brain-phase5-audit.md` — settled Brain surface decisions (do not re-litigate).
- `docs/business-brain-refresh-plan.md`, `docs/business-brain-architecture.md` — Brain program reference.
- `docs/canonical-scope-mapping.md`, `docs/asc-architecture.md` — scope and ASC reference.

## 1. Method

Source of truth for the route inventory:

- `src/config/canonicalNav.ts` — `WORKSPACE_NAV`, `WORKSPACE_NAV_GROUPS`, `WORKSPACE_NAV_PINNED`, `WORKSPACE_NAV_DEMOTED`.
- `src/pages/workspace/**` — every page component currently mounted under the workspace shell.
- `src/pages/workspace/brain/**` — the Business Brain sub-IA (already redesigned; included for cross-program coherence only).
- `src/pages/workspace/campaigns/**` — campaign decision/ASC subtree.
- `src/pages/workspace/settings/**` — current settings sub-pages.
- `src/pages/admin/**` — cross-referenced where operators land here from a workspace context.

### 1.1 Severity scale

| Level | Meaning |
|---|---|
| **Critical** | Operator cannot complete a core job-to-be-done, or the surface actively misleads about state. Blocks Phase 1. |
| **High** | Significant friction, duplicated mental model, or hidden capability that materially slows daily use. |
| **Medium** | Inconsistency, missing affordance, or unclear next step that an experienced operator routes around. |
| **Cosmetic** | Visual or language polish; no functional impact. |

### 1.2 Surface-state taxonomy

| State | Meaning |
|---|---|
| **canonical** | Intended long-term surface; design and IA are essentially correct. |
| **transitional** | Partway between two models; needs an explicit landing decision. |
| **legacy** | Older surface superseded in intent but still mounted. |
| **placeholder** | Route exists; content/empty state is stubbed or near-empty. |
| **read-only** | Surface is informational only; should not present authoring affordances. |

### 1.3 Out of scope for this audit

- Backend schemas, RLS, edge functions.
- Marketing site (separately complete).
- Trust / Security / legal pages.
- The Business Brain sub-IA (Phase 5-complete; referenced only for coherence).
- Auth / onboarding shells outside the logged-in workspace.

## 2. Route / surface inventory

Route prefix `/w/:workspaceId/` is implied in the **Route** column.

### 2.1 Workspace entry

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `(index)` | `WorkspacesIndexPage.tsx` | canonical | Pick / create a workspace | Operator, Admin | Choose workspace | Land on workspace home | No readiness signal per workspace (no campaign-live indicator, no last-active hint). | Y — readiness state exists (`useClientReadiness`). | Medium | **Redesign** (Phase 1): show per-workspace status chips. |
| `/home` | (redirect-only in `App.tsx`) | legacy | Old workspace home | — | n/a | Redirects to `campaigns` | Still referenced in some bookmarks; not a real surface. | n/a | Cosmetic | **Keep** as redirect; remove from any remaining UI references. |
| `LegacyWorkspaceRedirect.tsx` | same file | legacy | Compat redirect for older `/workspace/*` URLs | — | n/a | Forward to `/w/...` | Lives in workspace dir but isn't a surface; just verify it still resolves. | n/a | Cosmetic | **Keep**. |
| `WorkspaceResetPreviewPage.tsx` | same | placeholder | Dev/QA preview reset | Internal | Reset preview state | n/a | Reachable via deep link / ⌘K. | n/a | Medium | **Demote** behind a dev flag or move to superadmin. |

### 2.2 Build group (authoring)

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `campaigns` | `WorkspaceCampaignsPage.tsx` | canonical | List + manage campaigns | Operator | Find / start / monitor a campaign | Open campaign detail or create new | De-facto workspace landing (since `home` retired) but UI is a list, not a dashboard. No "you have N draft campaigns / M live / K need attention" summary. Readiness state from `useClientReadiness` not surfaced. | Y — readiness, archive state, blueprints all exist. | **High** | **Redesign** as the workspace landing (Phase 1 + 2). |
| `campaigns/new` | `WorkspaceCampaignNewPage.tsx` + `campaigns/WorkspaceCampaignNewDecisionPage.tsx` | transitional | Start a new campaign | Operator | Choose path (blank / blueprint / intake / ASC) | Land in the chosen authoring surface | Two "new" entry points; decision page exists but isn't clearly the canonical front door. ASC and intake both terminate here but the choice architecture isn't explicit. | Y — campaign blueprints, intake, ASC all wired. | **High** | **Merge** into a single decision page; reframe (Phase 2). |
| `campaigns/:id` | `WorkspaceCampaignDetailPage.tsx` | canonical | Campaign overview | Operator | Inspect a campaign | Edit flow / publish / view runs | Detail is text-heavy; readiness checklist, publish state, and DNIS/script links are not first-class. | Y — `useCampaignPublishConfig`, `computeCampaignReadiness`. | High | **Redesign** (Phase 4) to surface readiness + state. |
| `campaigns/:id/flow` | `WorkspaceCampaignFlowBuilderPage.tsx` | canonical | Visual flow builder | Operator | Edit campaign flow | Save / publish | Powerful but lives outside the campaign detail context. Breadcrumbs and "back to campaign" affordances thin. | n/a | Medium | **Keep**; tighten chrome (Phase 3). |
| `campaigns/asc/*` | `campaigns/asc/AscWizardPage.tsx`, `AscPreviewPage.tsx`, `steps/*` | canonical | ASC interview/wizard | Operator | Run AI-assisted campaign setup | Output → campaign draft | Wizard is the strongest authoring flow in the app, but it's hidden under campaigns/new and not positioned as the recommended path for new workspaces. | n/a | High | **Reframe** as the default first-campaign path (Phase 2). |
| `guide` | `WorkspaceGuideBuilderPage.tsx` (alias) | transitional | Workspace-level guide | Operator | Author the workspace-wide playbook | Save / publish | Overlaps heavily with `guides`, `templates`, and the campaign flow builder. Operators don't know which one is canonical. | Y — `useWorkspaceCanonicalGuide` exists. | **High** | **Reframe** as the canonical workspace guide; demote duplicates (Phase 3). |
| `guides` | `WorkspaceGuidesPage.tsx`, `WorkspaceGuide{Builder,Detail,Edit,New,Preview}Page.tsx` | transitional | List + edit reusable guides | Operator | CRUD guides | Open / edit | Five route files for one concept. Edit vs Builder vs Preview vs Detail unclear. Drift between Guides and Workspace Guide. | n/a | **High** | **Merge** Builder/Edit; **demote** Detail behind Preview (Phase 3). |
| `forms` | `WorkspaceFormsPage.tsx`, `WorkspaceForm{New,Builder,Detail}Page.tsx` | canonical | Public intake forms | Operator | Build / publish a form | Share public URL | Form builder pattern is solid; missing tie to campaign assignment in UI (assignment hook exists). | Y — `useFormCampaignAssignments`. | Medium | **Keep**; surface campaign assignment inline (Phase 3). |
| `templates` | `WorkspaceTemplatesPage.tsx`, `WorkspaceTemplateDetailPage.tsx` | transitional | Reusable templates | Operator | Pick / clone | Apply to campaign or guide | Unclear scope: templates of what (flow? guide? notification? blueprint?). Overlaps with Guides and Blueprints. | Y — `useWorkspaceTemplates`, `useCampaignBlueprints`. | **High** | **Merge** into a typed library (Phase 3). |
| `clients` | `WorkspaceClientsPage.tsx`, `WorkspaceClientDetailPage.tsx` | transitional | Client tenants within the workspace | Operator, Admin | Manage client configs | Edit client | Confusing relationship to admin `ClientsPage`. Workspace shows clients, admin shows clients, and `useWorkspaceClients` overlaps. Ownership of `integration_configs` per client is invisible. | Y — `config-merge.ts`, `useClientIntegrationConfigs`. | **Critical** | **Redesign** with explicit hierarchy view (Phase 1 + 3). |

### 2.3 Operate group

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `agent` | `WorkspaceAgentCockpitPage.tsx` | canonical | Live agent cockpit | Agent | Take/handle calls | Disposition, notes, transfer | No preconditions panel: agents land here even when script/dispositions/integration aren't ready. Cockpit ≠ landing for operators; mental model collision with `agents`/`supervisor`/`runs`. | Y — readiness, ASC, BB-Assist already feed it. | **High** | **Keep**; surface preconditions (Phase 4). |
| `dispositions` | `WorkspaceDispositionsPage.tsx` | canonical | Manage call outcomes | Operator | Author dispositions | Wire to flow + reports | Tightly coupled to access gating (`useDispositionAccess`) but page doesn't show effective access. | Y. | Medium | **Keep**; expose effective access (Phase 3). |
| `notifications` | `WorkspaceNotificationsPage.tsx` | canonical | Notification routing log/config | Operator | Configure / inspect notifications | Edit routes | Mixes log and config in one view; routing logic (urgency-based) hidden. | Y — `notification-routing-logic` memory. | Medium | **Redesign** split log vs config (Phase 3). |
| `brain` | `brain/BusinessBrainLayoutPage.tsx` + sub-pages | canonical | Business Brain workspace | Operator | Ingest / review / govern knowledge | Approve facts, etc. | Already redesigned (Brain Phase 1–5). | n/a | n/a | **Keep** as the visual reference for the program. |
| `assistant` | `WorkspaceAssistantPage.tsx` | canonical | Assistant config + chat | Operator | Tune assistant | Save config | Assistant config vs Brain governance overlap; user must learn which surface owns what. | Y — `useAssistantConfig`, BB bridge. | Medium | **Reframe** with explicit "what this controls" header (Phase 3). |

### 2.4 Insight group

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `qa` | `WorkspaceQaPage.tsx` | canonical | QA review queue + scoring | QA, Operator | Score calls | Mark reviewed | Light; no link to disposition or campaign context. | Y — `useQAReviews`, performance goals. | Medium | **Keep**; deepen context links (Phase 4). |
| `analytics` | `WorkspaceAnalyticsPage.tsx` | canonical | Workspace analytics | Operator | Inspect KPIs | Drill in | Overlaps with Reports (admin) and consolidated reporting center; scope confusing. | Y — `useWorkspaceAnalytics`, `data-plane-contracts`. | High | **Reframe** as workspace-scoped only; link out for cross-tenant (Phase 4). |
| `integrations` | `WorkspaceIntegrationsPage.tsx`, `WorkspaceIntegrationDetailPage.tsx` | transitional | Per-workspace integrations | Operator, Admin | Connect / configure | Detail edit | Multiple "integrations" surfaces across product: workspace integrations, admin connector catalog/instance, Legal Connect, Five9 domain. Operators get lost. | Y — `ui-managed-integrations`, `integrations-library`. | **High** | **Redesign** with clear catalog → instance pattern (Phase 3). |

### 2.5 Pinned

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `settings` | `WorkspaceSettingsPage.tsx` + `settings/BusinessBrainSettingsPage.tsx` | transitional | Workspace settings | Admin, Operator | Adjust workspace config | Save | Only one sub-page (`BusinessBrainSettingsPage`) exists; everything else is one big page. Settings sprawl is latent — likely to grow disorderly. | Y — many config hooks. | Medium | **Redesign** as a sectioned settings shell (Phase 1 + 3). |

### 2.6 Demoted but still mounted

| Route | File | State | Purpose | Persona | Current task | Expected next step | Problems | Backend ahead? | Severity | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `runs` | `WorkspaceRunsPage.tsx` | transitional | Run history | Operator | Inspect runs | Open a run | Demoted from sidebar but reachable via ⌘K and deep links; no clear "this is where runs live" entry. | Y. | High | **Reframe** as a tab inside Campaign detail (Phase 4). |
| `agents` | `WorkspaceAgentsPage.tsx` | transitional | Agent roster | Admin | Provision agents | Edit agent | Overlaps with admin `AgentsPage` and master `UsersManagementPage`. | Y — provisioning hooks. | High | **Merge** with admin agent management (Phase 3). |
| `supervisor` | `WorkspaceSupervisorPage.tsx` | transitional | Live supervisor view | Supervisor | Monitor live calls | Coach / barge | Hidden; supervisors don't know it exists. | Y — `useAgentPresence`, `useCallSessions`. | High | **Reframe** as a tab of Agent cockpit or its own canonical Operate surface (Phase 4). |
| `knowledge` (legacy) | redirect → `brain` | legacy | Old Brain entry | — | n/a | Redirects | Fine. | n/a | Cosmetic | **Keep** redirect. |

### 2.7 Adjacent admin surfaces operators encounter

Cross-referenced because operators land here from workspace context; not
redesigned by this program but flagged for IA implications.

| Route | File | Notes for IA |
|---|---|---|
| `admin/OverviewPage.tsx` | Admin landing — overlaps mental model with Workspaces index. |
| `admin/CampaignsPage.tsx` | Cross-tenant campaigns view; risk of confusion with workspace `campaigns`. |
| `admin/ClientsPage.tsx` | See 2.2 client confusion. |
| `admin/AgentsPage.tsx` | See 2.6 agents merge candidate. |
| `admin/IntegrationsPage.tsx` (and `ConnectorsCatalogPage`, `ConnectorInstancePage`, `LegalConnectPage`, `DomainsPage`) | Integrations sprawl — see §3.10. |
| `admin/NotificationsPage.tsx`, `EmailTemplatesPage.tsx` | Notification ownership split workspace vs admin. |
| `admin/ReportsPage.tsx`, `QAAnalyticsPage.tsx`, `Report59UploadPage.tsx` | Reporting sprawl — see §3.5. |

## 3. Thematic deep-dives

### 3.1 Authoring duplication — Workspace guide vs Guides vs Templates vs Flow builder

Four authoring surfaces (`guide`, `guides/*`, `templates`, `campaigns/:id/flow`)
overlap in purpose. Operators can't predict where a change should be made or
which surface "wins" when there's a conflict. Hooks (`useWorkspaceCanonicalGuide`,
`useWorkspaceGuides`, `useWorkspaceTemplates`, `useCampaignBlueprints`,
`useCampaignFlow`) show the backend already distinguishes them; the UI
doesn't. Severity: **High**. Resolution belongs to Phase 3
(page-type unification).

### 3.2 Client vs workspace ownership

A workspace contains clients (tenants); admin also has a Clients page; configs
merge via `config-merge.ts` with Client > Partner > Org precedence
(core memory). The current UI exposes none of that hierarchy in a single
view. Operators routinely ask "did I change it on the right client?" with
no visible answer. Severity: **Critical** for trust. Phase 1 IA must add
an always-visible context strip; Phase 3 should add a config-source
indicator on each editable field.

### 3.3 Setup flow opacity

There is no explicit "new workspace → first campaign live" path. Today a
new operator lands on `campaigns` (an empty list), with no readiness
checklist, no ASC nudge, no integration-status warning, and no link to
Business Brain ingest. Backend support exists
(`useClientReadiness`, `client-readiness-state` memory, ASC, BB) but is
not stitched into a journey. Severity: **High**. Phase 2 owns this.

### 3.4 Agent cockpit readiness

`agent` cockpit, `runs`, `agents`, `supervisor` form a four-page mental
model with no shared chrome. Agents can open the cockpit before a
campaign is publishable; no precondition panel surfaces what's blocking
live calls. Severity: **High**. Phase 4 polish should add a single
readiness gate.

### 3.5 Operate vs Insight blur (analytics / QA / reports / notifications)

`analytics`, `qa`, `notifications`, plus admin `ReportsPage`,
`QAAnalyticsPage`, and `Report59UploadPage` overlap. The
"consolidated reporting center" memory promised one hub; the UI hasn't
caught up. Severity: **High**. Phase 3 (IA) + Phase 4 (cockpit) resolve.

### 3.6 Demoted but reachable routes

`runs`, `agents`, `supervisor` (plus `WorkspaceResetPreviewPage`) are hidden
from the sidebar but live in ⌘K and deep links, producing "ghost
navigation." Severity: **Medium**. Phase 1 IA should either re-promote
(with new chrome) or formally remove from command palette.

### 3.7 Empty / no-data states

Surfaces that currently show an empty table or near-blank panel instead of
guided next-steps:

- `campaigns` (no campaigns yet → no "start with ASC" CTA)
- `guides`, `templates`, `forms` (empty list, no contextual seed)
- `dispositions` (empty → unclear that default set exists)
- `qa` (empty queue → no instructions)
- `analytics` (empty range → looks broken)
- `notifications` (empty config → no "you'll be notified when…" preview)
- `clients` (empty → unclear if one is required)
- `integrations` (empty → no "recommended for your vertical")
- `runs`, `agents`, `supervisor` (demoted; empty if cockpit not used)

Severity: **High** in aggregate. Phase 2 + Phase 3 each fix a slice.

### 3.8 Internal phase / implementation language leaks

Audit candidates to grep for during Phase 1 (catalog only; no rewrites in
Phase 0):

- "Phase", "Slice" — in any user-facing string.
- "Canonical", "Bridge", "Selector", "Promotion", "Shadow" — internal vocabulary.
- "Outcome write-back", "Pass-through", "Adapter" — implementation phrasing.
- "Fork", "Dispatch" — engineering terms surfaced in UI.

Severity: **Medium** (cosmetic where isolated, **High** where it
appears in primary nav or empty-state copy).

### 3.9 Settings sprawl

`settings` is one large page plus a single sub-page
(`settings/BusinessBrainSettingsPage.tsx`). Risk: as workspace config grows
(branding, dispositions defaults, notification routing, integrations,
readiness), settings will become unmanageable without a sectioned shell.
Severity: **Medium** now, latent **High**. Phase 1 introduces the shell;
Phase 3 fills sections.

### 3.10 Integrations sprawl

Five distinct integration surfaces across the product:
- `workspace/integrations` (canonical for workspace-scoped)
- `admin/connectors` catalog and instance pages
- `admin/LegalConnectPage`
- `admin/DomainsPage` (Five9)
- `admin/MappingsPage` / `MappingBuilderPage`

Operators don't have a single "what is connected, where, for whom" view.
Severity: **High**. Phase 3 introduces a canonical catalog → instance
pattern, scoped clearly to workspace vs org.

## 4. Empty-state catalog

See §3.7 — full per-surface list above. Phase 1 inventories the actual
empty-state markup file by file; Phase 2 introduces the shared empty-state
primitive (referencing the Brain pattern: title, one-sentence intent, one
primary action, one secondary link to docs).

## 5. Language-leak catalog

See §3.8. Phase 1 produces the grep manifest (`rg -n
'Phase|Slice|Canonical|Bridge|Shadow|Promotion|Fork|Dispatch'
src/pages src/components src/shells`) and decides per-hit whether to
rename, hide, or keep (internal-only surface).

## 6. Cross-references — settled decisions

These are **not** re-litigated by this program:

- Business Brain sub-IA, Approve/Suggest/Bin/Search/Governance/Health tabs — see `docs/business-brain-phase5-audit.md`.
- ASC architecture, wizard ↔ BB bridge — see `docs/asc-architecture.md`.
- Canonical terms (org / partner / client) — see `docs/canonical-scope-mapping.md` and `src/lib/canonical-terms.ts`.
- Marketing site IA + copy — Business Brain Phase 3–5; this program does not touch it.

## 7. Summary by severity

- **Critical (1):** Client vs workspace ownership (§3.2).
- **High (8):** Campaigns landing, campaigns/new merge, campaigns/:id readiness, Workspace guide reframe, Guides consolidation, Templates typed library, Clients hierarchy view, Integrations sprawl, plus thematic items: setup flow opacity, agent cockpit readiness, operate-vs-insight blur, empty states (aggregate).
- **Medium:** Workspaces index, Forms campaign-assignment, Dispositions access surface, Notifications log/config split, Assistant scope header, Settings shell, Reset preview demotion, demoted-route ghost nav, language leaks (isolated).
- **Cosmetic:** Legacy redirects, isolated language leaks.

## 8. Feature gaps vs IA/UX issues

Items that look like genuine **feature gaps**, not IA fixes — recommended to
park as future capability work rather than fold into this program:

- Per-workspace status chips on the Workspaces index require a status
  aggregator that doesn't fully exist today (`useClientReadiness` is
  workspace-internal).
- A unified "what is connected, where, for whom" integrations view may
  require a backend rollup not yet shipped.
- Supervisor live-coaching affordances (barge / whisper) — if absent in
  backend, this is a feature, not IA.

These are listed here so they aren't silently absorbed into Phases 1–5.

— End of audit —

---

## 11. Phase 1 resolutions — IA & Navigation Cleanup

Mapping of Phase 0 issues to the Phase 1 file changes that resolved (or
visibly relabeled) them. Items not listed remain open for Phase 2+.

| Audit theme | Resolution | Files |
|---|---|---|
| Sidebar groups not aligned to canonical IA | Sidebar reshaped to **Build / Operate / Insight / Connect / Settings**. Connect is a new sibling for Integrations. | `src/config/canonicalNav.ts`, `src/shells/WorkspaceShell.tsx` |
| Three competing cockpit entries (`agent`, `runs`, `supervisor`) | Introduced a virtual **Cockpit** nav item pointing at the existing `/agent` route. Runs and Supervisor moved into the demoted set. The tabbed Cockpit shell is Phase 4. | `src/config/canonicalNav.ts` |
| Guides vs Templates IA confusion | Introduced a virtual **Library** nav label pointing at `/guides`. Templates moved to the demoted set. Phase 3 will merge the actual surfaces. | `src/config/canonicalNav.ts` |
| Demoted routes still visible in ⌘K to all roles | Demoted group renamed **Hidden / Legacy** and gated behind workspace-admin / master-admin only. Operators no longer see them. Routes still mounted. | `src/components/workspace/WorkspaceCommandPalette.tsx` |
| Workspace ownership invisible to operators | New `WorkspaceScopeContext` + `WorkspaceScopeStrip` rendered in the context bar. Pages with authoritative scope (currently Clients detail) opt in. No inference elsewhere. | `src/contexts/WorkspaceScopeContext.tsx`, `src/components/workspace/WorkspaceScopeStrip.tsx`, `src/components/workspace/WorkspaceContextBar.tsx` |
| Clients detail explains ownership as prose | Replaced with a structured **Ownership & scope** card: visible in this workspace, owned at org, editable in org admin, inherited fields. CTA links to `/admin/clients/:id`. | `src/pages/workspace/WorkspaceClientDetailPage.tsx` |
| Duplicate "New campaign" affordances | Removed the redundant ActionCard above the campaigns table; the header `New campaign` button is now the single entry. | `src/pages/workspace/WorkspaceCampaignsPage.tsx` |
| Internal phrasing in New Campaign helper copy | "Canonical campaign intake… legacy edit URL" rewritten as a plain operator description noting drafts autosave and appear in the Campaigns list. | `src/pages/workspace/WorkspaceCampaignNewPage.tsx` |
| Language leaks (Phase N / canonical / slice) | Stripped from Business Brain Settings flag descriptions, QA page footnote, Analytics page footnote, Campaign detail "Phase 3 note", Supervisor empty state, Knowledge config descriptions, Clients list lede, Campaigns list lede. | `src/pages/workspace/settings/BusinessBrainSettingsPage.tsx`, `src/pages/workspace/WorkspaceQaPage.tsx`, `src/pages/workspace/WorkspaceAnalyticsPage.tsx`, `src/pages/workspace/WorkspaceCampaignDetailPage.tsx`, `src/pages/workspace/WorkspaceSupervisorPage.tsx`, `src/pages/workspace/WorkspaceKnowledgePage.tsx`, `src/pages/workspace/WorkspaceClientsPage.tsx`, `src/pages/workspace/WorkspaceCampaignsPage.tsx` |
| Stale regression assertions about prior IA | Updated nav-group assertions to expect Build / Operate / Insight / Connect, Cockpit in Operate, Library in Build, Templates / Guides in the demoted set. Fixed a pre-existing `navRouting` parser bug that silently swallowed routes after the nested `brain` block. | `src/test/regressions/canonicalScopeAlignment.test.ts`, `src/test/regressions/navRouting.test.ts` |

### Residual items deferred

- **Cockpit shell as a tabbed surface** merging Live / Supervisor / Runs — Phase 4.
- **Merged Library shell** (Guides + Templates + Blueprints) — Phase 3.
- **Settings sectioned shell** — Phase 3.
- **Workspace landing readiness checklist** — Phase 2.
- **Notifications log/config split** — Phase 3.
- **Cross-workspace ownership** (true `workspace_id` on `tenants`) — would require backend/schema work; remains a parked feature gap.

### Regression baseline

`bunx vitest run`: **1069 passed / 5 failed / 7 skipped** (1081 total).
Previous baseline: 1068 / 6 / 7. The five remaining failures are all
pre-existing and unrelated to Phase 1:

- `ascRouteTransitionContinuity` (AscOriginPanel parity)
- `ascWizardPersistence` (2 — campaign_setups lazy insert + ascDraft payload)
- `bbSearchAscBoundary` (ASC ↔ BB import boundary)
- `chromeNeutralization` (placeholder strings in ASC steps)

Phase 1 fixed the previously-failing `navRouting` "visible workspace
sidebar items are mounted" assertion as a side effect of repairing the
parser that was silently skipping routes after the `brain` nested block.
