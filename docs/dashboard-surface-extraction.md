# Dashboard Surface Extraction Pass

> Forensic extraction of every client/org/workspace dashboard surface in Fabric59 today.
> No code changes. No redesign. Phase 1 of a 3-phase consolidation (Phase 2: client dashboard revamp; Phase 3: superadmin redesign).

Source of truth: `src/App.tsx`, `src/data/surfaceAudit.ts`, the page components themselves.

---

## 1. Dashboard route inventory

| Route | Component | Heading | Scope | Canonical / Compat | In nav? | Redirects? | Target | Notes |
|---|---|---|---|---|---|---|---|---|
| `/admin` | `OverviewPage` (`src/pages/admin/OverviewPage.tsx`) | `{organization.name}` or "Organization Overview" | org | canonical | yes (admin shell index) | no | — | The org-level cockpit. |
| `/app/workspaces/:workspaceId` | (Navigate) | — | workspace | canonical redirect | no | yes | `home` | Workspace shell index. |
| `/app/workspaces/:workspaceId/home` | `WorkspaceHomePage` (`src/pages/workspace/WorkspaceHomePage.tsx`) | `{workspace.name}` | workspace | canonical | yes (workspace shell) | no | — | Nav scaffold only. Zero queries. |
| `/dashboard` | (Navigate) | — | compat | compat redirect | no | yes | `/admin` | Top-level legacy alias. |
| `/admin/dashboard` | (Navigate) | — | compat | compat redirect | no | yes | `/admin` | Phase 11 collapse. |
| `/admindashboard` | — | — | — | — | no | — | — | **Not present** in `src/` or `public/`. No route, no redirect, no reference. Historical only. |
| `/admin/agent-dashboard` | `AgentDashboardPage` (`src/pages/admin/AgentDashboardPage.tsx`) | "Agent Dashboard" | agent | compatibility-only | no (de-surfaced from primary nav) | no | — | Operational surface kept routable. |

Adjacent overview-shaped surfaces (flagged, not deeply extracted in this pass):

| Route | Component | Why noted |
|---|---|---|
| `/admin/clients/:id` | `ClientOverviewPage` | Per-client cockpit, uses `QuickActionsGrid` client variant. |
| `/admin/clients/:id/workspace` | `ClientWorkspacePage` | Same shape as `ClientOverviewPage`. |
| `/admin/partners/:id` | `PartnerOverviewPage` | Partner cockpit. |
| `/admin/five9` | `Five9Page` (mounted) / `Five9OverviewPage` (file present) | Five9 hub. |
| `/admin/legal-connect/overview` | `LegalConnectOverviewPage` | LC cockpit. |
| `/admin/supervisor` | `SupervisorPage` | Live ops surface. |
| `/superadmin` | `SuperadminOverviewPage` | **Out of scope — Phase 3.** |

---

## 2. Canonical vs compatibility truth

Canonical (sourced from `App.tsx` Route comments):

```text
/admin                                  → OverviewPage             (org overview)        [canonical]
/app/workspaces/:workspaceId            → Navigate /home                                  [canonical redirect]
/app/workspaces/:workspaceId/home       → WorkspaceHomePage        (workspace home)      [canonical]
```

Compatibility redirects:

```text
/dashboard                              → Navigate /admin           (top-level alias)
/admin/dashboard                        → Navigate /admin           (Phase 11 collapse)
```

Compatibility-only (routable, de-surfaced from primary nav):

```text
/admin/agent-dashboard                  → AgentDashboardPage
```

`/admindashboard`: confirmed absent from the routing graph and from all source files. No action needed.

---

## 3. `/admin` (Org Overview) — full extraction

File: `src/pages/admin/OverviewPage.tsx` (65 lines).

### Shell
- Icon (`Building2`) + title `{organization?.name ?? "Organization Overview"}`
- Subtitle: "Workspaces, connectors, reports, and live operations at a glance"
- No breadcrumb, no tabs, no top-right actions.

### Data fetched at the page level
- `useAuth()` → `organization`
- One Supabase query: `tenants.select("id").eq("organization_id", organization.id).limit(1).maybeSingle()` — used to derive a single readiness object.
  - **Flag:** the org overview uses the **first tenant** as a stand-in for org readiness. This is single-tenant readiness masquerading as org-level state. Track for Phase 2.

### Sections (render order)

| # | Section | File | Data source | Empty/loading | Notes |
|---|---|---|---|---|---|
| 1 | `SystemHealthStrip` | `src/components/dashboard/SystemHealthStrip.tsx` | Real (org-scoped queries by `organizationId` prop) | own | Page-level KPIs live here, not on `OverviewPage`. |
| 2 | `QuickActionsGrid` (org variant — no `clientId` prop) | `src/components/dashboard/QuickActionsGrid.tsx` | Static link list | n/a | See CTA table below. |
| 3 | `WorkspaceSnapshotPanel` | `src/components/dashboard/WorkspaceSnapshotPanel.tsx` | Real (`organizationId`) | own | Workspace count / quick links. |
| 4 | `ConnectorsReportsPanel` | `src/components/dashboard/ConnectorsReportsPanel.tsx` | Real (`organizationId`) | own | Connectors + reports snapshot. |
| 5 | `ReadinessChecklist` ("Setup Progress") | `src/components/dashboard/ReadinessChecklist.tsx` | Derived from single-tenant `readiness` | `loading` prop | Mislabeled at org scope (see flag above). |
| 6 | `AIGuidanceCard` | `src/components/dashboard/AIGuidanceCard.tsx` | `getNextActions(readiness)` from `src/lib/readiness/computeCampaignReadiness.ts` | own | Up to 3 actions. |
| 7 | `OnboardingResumeCard` | `src/components/onboarding/OnboardingResumeCard.tsx` | Local onboarding state | conditional render | Hidden if onboarding complete. |

### CTA tables

`QuickActionsGrid` (org variant, no `clientId`):

| Label | Destination | Canonical? | Scope |
|---|---|---|---|
| View workspaces | `/admin/workspaces` | canonical | org ✓ |
| Open connectors | `/admin/connectors` | canonical | org ✓ |
| View reports | `/admin/reports` | canonical | org ✓ |
| Open docs | `/admin/docs` | canonical | org ✓ |

`AIGuidanceCard` (every emitted href from `getNextActions`):

| Condition | Title | Destination |
|---|---|---|
| `!domain_connected` | Connect a Five9 domain | `/admin/domains` |
| `domain_connected && !campaign_exists` | Create your first campaign | `/admin/campaigns/new` |
| `campaign_exists && !variable_group_exists` | Add a call variable group | `/admin/campaigns/new` |
| `campaign_exists && !dispositions_configured` | Configure dispositions | `/admin/dispositions` |
| `campaign_exists && !provider_connected` | Connect a legal provider | `/admin/legal-connect` |
| `route_count > 0 && ready_route_count === 0` | Run a readiness test | `/admin/test` |
| empty (all pass) | You're ready | `/admin/campaigns` |

All canonical. All scoped to `/admin/*` (org), even though the underlying readiness object is a single-tenant proxy.

---

## 4. `/app/workspaces/:id/home` (Workspace Home) — full extraction

File: `src/pages/workspace/WorkspaceHomePage.tsx` (47 lines).

### Shell
- "Canonical" outline `Badge`
- Title = `workspace.name`
- Subtitle: "Workspace home. Jump into any canonical section below."
- No tabs, no KPI strip, no readiness, no AI guidance, no onboarding resume.

### Sections
- **One section only:** a 1–3 column nav-card grid generated from `SURFACED_WORKSPACE_SECTIONS` (`src/config/navigation.ts`) with `s.key !== "home"` filtered out.

Cards rendered (label → destination):

| Label | Destination |
|---|---|
| Clients | `/app/workspaces/:id/clients` |
| Campaigns | `/app/workspaces/:id/campaigns` |
| Guides | `/app/workspaces/:id/guides` |
| Templates | `/app/workspaces/:id/templates` |
| QA | `/app/workspaces/:id/qa` |
| Analytics | `/app/workspaces/:id/analytics` |
| Integrations | `/app/workspaces/:id/integrations` |
| Settings | `/app/workspaces/:id/settings` |

(De-surfaced workspace sections — Forms, Runs, Agents, Supervisor, Knowledge, Assistant — are routable but not rendered as cards here.)

### Data
- **Zero queries.** Pure nav scaffold using only `useWorkspace()`.

### Gap analysis vs `/admin`
Missing from Workspace Home compared to Org Overview:
- No KPI/system-health strip
- No readiness checklist
- No AI guidance
- No quick-action grid (create campaign / connect provider / run readiness)
- No connectors+reports snapshot
- No onboarding-resume card
- No recent activity / runs

This is the **biggest revamp target in Phase 2**.

---

## 5. `/admin/agent-dashboard` (Legacy Agent Dashboard) — full extraction

File: `src/pages/admin/AgentDashboardPage.tsx` (250 lines).

### Header
- `PageHeader` title "Agent Dashboard", subtitle "Your personal workspace: tasks, calls, goals, and performance", `Zap` icon.

### KPI strip (4 `PremiumStatCard`s)

| Card | Source | Notes |
|---|---|---|
| Calls Today | `todaySessions.length` from `useScriptSessions(20)` filtered to today | tier `hero`, primary |
| Avg Handle Time | derived from session `duration_seconds` | default |
| Tasks Pending | `tasks.filter(status === "pending").length` from `useTasks({ assigned_to: user.id })` | warning when > 0 |
| Sessions | `sessions.length` (total within fetched 20) | success |

### Tabs
1. **Overview** (default)
2. **Tasks** (badge with pending count)
3. **Notes**
4. **Callbacks**
5. **AI Assist**

### Overview tab sections

| Section | Hook(s) | Mock vs real | Empty state |
|---|---|---|---|
| Task Queue (top 5 by priority) | `useTasks` + `useUpdateTask` | real | "No tasks assigned." |
| Recent Sessions table (top 10) | `useScriptSessions(20)` | real | "No call sessions recorded yet." |
| Calls by Hour `BarChart` | `MOCK_HOURLY` synthesized from `todaySessions` over hours 9–16 | **mock structure, real counts** | renders empty bars |
| My Goals (top 4) | `usePerformanceGoals("active")` | partial — `Progress` always shows `0` (no progress wiring) | "No active goals assigned." |
| Training Modules | `useTrainingModules` + `useTrainingProgress` | real | "No training modules available." |

### Other tabs
- **Tasks** → `<TaskQueuePanel />`
- **Notes** → `<AgentCallNotesInput callSessionId={lastSession?.id} />` + `<PostCallSummary session={lastSession} />`
- **Callbacks** → `<CallbackRemindersPanel />`
- **AI Assist** → `<AINodeSuggestions currentNodeType="question" />`

### Duplication call-outs vs `/admin` and Workspace Home
- KPI strip duplicates concept of `SystemHealthStrip` (org) but at agent scope.
- Task Queue + Callbacks are agent-personal, **not present** on either dashboard — unique content.
- AI Assist is **distinct** from `AIGuidanceCard` (node suggestions vs setup actions).
- Training Modules + Goals are **unique** to this surface.
- Recent Sessions has no equivalent on `/admin` or Workspace Home.

### Unique content worth preserving
Task queue, callbacks, AI node suggestions, training progress, performance goals, recent sessions, calls-by-hour. These belong on a future workspace **Agents** surface (`/app/workspaces/:id/agents`), not on either dashboard.

---

## 6. CTA destination audit

| Source | CTA label | Destination | Type | Scope correctness |
|---|---|---|---|---|
| `/admin` `QuickActionsGrid` | View workspaces | `/admin/workspaces` | canonical | org ✓ |
| `/admin` `QuickActionsGrid` | Open connectors | `/admin/connectors` | canonical | org ✓ |
| `/admin` `QuickActionsGrid` | View reports | `/admin/reports` | canonical | org ✓ |
| `/admin` `QuickActionsGrid` | Open docs | `/admin/docs` | canonical | org ✓ |
| `/admin` `AIGuidanceCard` | Connect a Five9 domain | `/admin/domains` | canonical | org-scoped ✓ |
| `/admin` `AIGuidanceCard` | Create your first campaign | `/admin/campaigns/new` | canonical | org-scoped ✓ |
| `/admin` `AIGuidanceCard` | Add a call variable group | `/admin/campaigns/new` | canonical | org ✓ (note: wizard double-duty) |
| `/admin` `AIGuidanceCard` | Configure dispositions | `/admin/dispositions` | canonical | org ✓ |
| `/admin` `AIGuidanceCard` | Connect a legal provider | `/admin/legal-connect` | canonical | org ✓ |
| `/admin` `AIGuidanceCard` | Run a readiness test | `/admin/test` | canonical | org ✓ |
| `/admin` `AIGuidanceCard` | You're ready | `/admin/campaigns` | canonical | org ✓ |
| `/admin` `OnboardingResumeCard` | (resume target — varies) | onboarding deep link | canonical | org ✓ |
| Workspace Home card | Clients | `/app/workspaces/:id/clients` | canonical | workspace ✓ |
| Workspace Home card | Campaigns | `/app/workspaces/:id/campaigns` | canonical | workspace ✓ |
| Workspace Home card | Guides | `/app/workspaces/:id/guides` | canonical | workspace ✓ |
| Workspace Home card | Templates | `/app/workspaces/:id/templates` | canonical | workspace ✓ |
| Workspace Home card | QA | `/app/workspaces/:id/qa` | canonical | workspace ✓ |
| Workspace Home card | Analytics | `/app/workspaces/:id/analytics` | canonical | workspace ✓ |
| Workspace Home card | Integrations | `/app/workspaces/:id/integrations` | canonical | workspace ✓ |
| Workspace Home card | Settings | `/app/workspaces/:id/settings` | canonical | workspace ✓ |
| Agent Dashboard | (none at page level) | — | — | — |
| Agent Dashboard › `TaskQueuePanel` | Task interactions | in-component | n/a | agent ✓ (audited inline in Phase 2) |
| Agent Dashboard › `CallbackRemindersPanel` | Callback interactions | in-component | n/a | agent ✓ |
| Agent Dashboard › `AINodeSuggestions` | Node suggestions | in-component | n/a | agent ✓ |

No CTA on any of the three surfaces points at a redirecting or stale target.

---

## 7. Dashboard overlap matrix

Legend: ● present · ◐ partial · ○ absent

| Concept | `/admin` Org Overview | `/app/workspaces/:id/home` Workspace Home | `/admin/agent-dashboard` Agent Dashboard |
|---|---|---|---|
| KPI / stat strip | ● (`SystemHealthStrip`) | ○ | ● (4 `PremiumStatCard`) |
| System health | ● | ○ | ○ |
| Readiness checklist | ◐ (single-tenant proxy) | ○ | ○ |
| AI guidance (setup) | ● (`AIGuidanceCard`) | ○ | ○ |
| AI assist (in-call) | ○ | ○ | ● (`AINodeSuggestions`) |
| Quick actions | ● (org) | ○ | ○ |
| Workspace list snapshot | ● (`WorkspaceSnapshotPanel`) | ○ | ○ |
| Connectors snapshot | ● | ○ | ○ |
| Reports snapshot | ● | ○ | ○ |
| Onboarding resume | ● | ○ | ○ |
| Task queue | ○ | ○ | ● |
| Callbacks | ○ | ○ | ● |
| Training | ○ | ○ | ● |
| Recent sessions | ○ | ○ | ● |
| Performance goals | ○ | ○ | ● |
| Calls by hour | ○ | ○ | ● |

Where each concept **should** live (recommendation, not implemented):

- Org Overview only: system health, workspace list snapshot, connectors snapshot, reports snapshot, org-level quick actions, onboarding resume.
- Workspace Home only: workspace KPIs, workspace readiness, workspace AI guidance, workspace quick actions, recent activity scoped to the workspace.
- Future workspace **Agents** surface (`/app/workspaces/:id/agents`): task queue, callbacks, AI node suggestions, training, recent sessions, performance goals, calls-by-hour.
- Remove from any dashboard: single-tenant readiness on the org overview (it's mis-scoped) and any duplicated AI guidance once Workspace Home gets its own.

---

## 8. Recommended canonical split (recommendation only)

**Org Overview (`/admin`).** Keep org-wide health, workspace snapshot, connectors+reports snapshot, org-level quick actions, onboarding resume. **Drop** the single-tenant `ReadinessChecklist` + the readiness-driven `AIGuidanceCard` from this surface — readiness is per-client and belongs on the client cockpit, not the org overview.

**Workspace Home (`/app/workspaces/:id/home`).** Currently empty. Phase 2 should build: workspace-scoped KPIs, workspace readiness checklist, workspace quick actions (create campaign / connect / test inside this workspace), workspace AI guidance, recent activity. The current nav-card grid can move into the shell sidebar; the home should not be a link list.

**Agent Dashboard (legacy `/admin/agent-dashboard`).** Convert to a redirect to `/app/workspaces/:id/agents` (per the canonical workspace tree). Migrate unique content (tasks, callbacks, AI assist, training, goals, recent sessions, calls-by-hour) into that workspace-scoped surface. Do **not** fold any of this into either dashboard.

---

## 9. Superadmin implications (noted, not implemented)

- `/superadmin` (`SuperadminOverviewPage`) overlaps conceptually with Org Overview — needs its own extraction in Phase 3.
- `AdvancedRoutesPage` and other superadmin inventory pages still list compatibility-only dashboard surfaces (`/admin/agent-dashboard`, `/admin/dashboard`). Re-validate during Phase 3 when redirects are introduced.
- Org/admin gating and role-routing behavior should be re-checked during the superadmin pass, but **not** changed in this extraction pass.
- `/admindashboard` is confirmed absent — no superadmin cleanup needed there.

---

### Files created or updated by this pass
- created: `docs/dashboard-surface-extraction.md`

No code changes. No backend, RLS, auth, routing, or superadmin behavior modified.
