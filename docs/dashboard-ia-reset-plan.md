# Dashboard IA Reset — Canonical Blueprint & Phased Roadmap

Program: **Dashboard Consolidation + UX Reset**.
Companion: `docs/dashboard-ux-audit.md` (read first).

This document defines the target information architecture for the logged-in
workspace, the canonical setup and operator journeys, the page-type patterns
to unify, and the phased roadmap that follows Phase 0.

No code is written by this document. Each later phase is its own approval.

## 1. Canonical logged-in IA

Goal: one mental model — **Build what runs → Operate what's running → Learn
from what ran.** Settings + admin overlay sit beside the loop, not inside it.

### 1.1 Top-level groups (operator-facing)

```text
Build      → Campaigns · Workspace guide · Library (guides + templates + blueprints) · Forms · Clients
Operate    → Cockpit (agent + supervisor + runs) · Brain · Assistant · Dispositions · Notifications
Insight    → Analytics · QA · Reports
Connect    → Integrations (workspace + org instances surfaced together)
Settings   → Workspace · Brand · Readiness · Members · Advanced
```

Changes vs today's `WORKSPACE_NAV_GROUPS`:

- **Library** replaces standalone `guides` + `templates` (Phase 3 unifies the underlying surfaces; nav reframes them).
- **Cockpit** absorbs `agent`, `supervisor`, `runs` (currently three separate items; two of them demoted).
- **Connect** is a new sibling group rather than an Insight sub-item, because integration scope spans workspace and org.
- **Workspace guide** stays top-level under Build as the canonical playbook — `Guides` becomes a child of Library.
- **Settings** moves from a single page to a sectioned shell.

### 1.2 What's top-level, nested, contextual, admin-only

| Tier | Surfaces |
|---|---|
| Top-level (sidebar) | Campaigns · Workspace guide · Library · Forms · Clients · Cockpit · Brain · Assistant · Dispositions · Notifications · Analytics · QA · Connect · Settings |
| Nested under a parent | Library → Guides / Templates / Blueprints · Cockpit → Live / Supervisor / Runs · Settings → Workspace / Brand / Readiness / Members / Advanced |
| Contextual (tab/drawer inside a detail page) | Campaign detail → Overview / Flow / Readiness / Runs / Publish; Form detail → Builder / Logic / Submissions / Assignments; Client detail → Profile / Integrations / Configs (with merge source) |
| Admin-only | Connectors catalog · Cross-tenant Campaigns / Clients / Agents · Domains · Legal Connect · Mappings · Email templates · API logs · Test console |
| Demoted / read-only / dev | Reset preview · `WorkspaceResetPreviewPage` · legacy redirects |

### 1.3 What disappears from primary nav

- `runs`, `agents`, `supervisor` as separate items (folded into Cockpit).
- `templates` as a separate item (folded into Library).
- `home` redirect (already retired; no nav surface).

## 2. Canonical setup journey — new workspace → first campaign live

A guided sequence with explicit gates. Each step is an existing capability
(or composition of existing capabilities); no new product surface is
proposed by this program.

```text
1. Create workspace            (existing Workspaces index)
2. Set workspace identity      (Settings → Workspace + Brand)
3. Seed knowledge              (Brain → Knowledge Bin: paste / CSV / FAQ)
4. Connect at least one channel (Connect → Integrations: Five9 or similar)
5. Author first campaign       (Campaigns → New → ASC wizard is the default)
6. Configure dispositions      (Dispositions, prefilled by ASC outputs)
7. Publish + readiness check   (Campaign detail → Readiness tab; gated by checklist)
8. Go live                     (Cockpit → Live; readiness panel confirms preconditions)
```

### 2.1 Canonical workspace setup checklist (Phase 2 implementation)

Implemented as a single read-only model in `useWorkspaceSetupReadiness`
and rendered by `WorkspaceSetupChecklist` (panel + strip variants). No
schema, no new capabilities — every signal is composed from existing
data. The labels are deliberately honest about what each signal proves
(for example, "Business Brain seeded" reflects fact count ≥ 1, not
complete knowledge).

| Step | Label | Signal (existing data) | Deep-link |
|---|---|---|---|
| 1 | Workspace identity set | `workspaces.name` non-empty (`useWorkspace`) | `/w/:id/settings` |
| 2 | Business Brain seeded | Approved `bb_facts` count ≥ 1 (via `countApprovedFacts` in `bridge/core`) | `/w/:id/knowledge` |
| 3 | Channel connected | `integration_connections.status='connected'` count ≥ 1 (`useWorkspaceIntegrationConnections`) | `/w/:id/integrations` |
| 4 | Workspace guide published | `guides.status='published'` where `name = WORKSPACE_GUIDE_SINGLETON_NAME` | `/w/:id/guide` |
| 5 | First campaign created | `campaigns` (workspace-scoped) count ≥ 1 (`useWorkspaceCampaigns`) | `/w/:id/campaigns` |
| 6 | Dispositions configured | `disposition_access` (org-scoped) count ≥ 1 (`useDispositions`) | `/w/:id/dispositions` |
| 7 | Campaign reaches publish-ready | `fetchCanonicalCampaignReadiness` (firmGuide + flow + intake + notifications) true for ≥ 1 campaign — the **same** helper that drives `CampaignReadinessChecklist` | `/w/:id/campaigns` |
| 8 | Cockpit ready to take calls | Steps 1–7 all complete (derivative) | `/w/:id/agent` |

Surface mapping:

- **Campaigns landing** — full panel when no campaigns exist; compact
  strip above the table when partially complete; hidden when ready.
- **Agent Cockpit** — prominent "not ready" panel above the cockpit body
  when incomplete (body de-emphasized at 60% opacity, never hard-blocked);
  slim "Ready" strip when complete.
- **Campaign New** — inline `Before this campaign can go live` hint
  listing missing prerequisites (knowledge, channel, dispositions,
  workspace guide).
- **Guides / Forms / Dispositions empty states** — explain how each
  surface contributes to readiness; primary CTA unchanged.
- **Brain Settings** — subtle `Affects workspace readiness` badge on
  the Brain core flag. Brain Settings is **not** an onboarding hub.

Dismissal: no `localStorage`. The strip simply disappears once readiness
reaches 100%; the panel surfaces revert to their default content.

Gating signals (already in backend, surfaced inline):

- `countApprovedFacts` (bridge/core) → knowledge minimum indicator.
- `useWorkspaceIntegrationConnections` → channel-connected gate.
- `useWorkspaceCampaigns`, `useDispositions` → list-presence gates.
- `fetchCanonicalCampaignReadiness` → publish gate (shared with
  per-campaign view; never forked).

Surface owner: **Workspace landing** hosts the readiness checklist; each
step deep-links into the surface that owns it. Single source of truth, no
duplicated wizard.

## 3. Canonical ongoing operator journey

Daily and weekly loops, mapped to surfaces:

| Cadence | Job | Surface |
|---|---|---|
| Daily AM | What needs my attention? | Workspace landing (readiness + notifications digest) |
| Daily | Take calls | Cockpit → Live |
| Daily | Review notifications | Notifications (log split from config) |
| Daily | Approve knowledge | Brain → Suggested Facts |
| Weekly | Score calls | QA queue |
| Weekly | Read analytics | Analytics |
| Weekly | Tune assistant / brain | Assistant + Brain Governance |
| Monthly | Update guides / templates / dispositions | Library + Dispositions |
| Monthly | Reconcile integrations | Connect |

The cockpit, not Campaigns, is the agent landing; operators land on
Campaigns (now a dashboard, not a list).

## 4. Page-type patterns to unify

| Pattern | Standard | Used by |
|---|---|---|
| **List** | Header + filter bar + table + empty state primitive; bulk actions in toolbar | campaigns, guides, templates, forms, clients, runs, dispositions |
| **Detail** | Header strip (status + scope chip) + tabbed body + side rail for related actions | campaign, guide, form, client, integration |
| **Builder** | Full-bleed canvas + side panel + footer save bar; explicit publish state | flow builder, guide builder, form builder, ASC wizard |
| **Runtime** | Operator chrome (minimal nav) + primary work area + readiness/context strip | cockpit, supervisor |
| **Empty state** | One sentence intent + one primary action + one docs link; never a blank table | every list surface |
| **Readiness** | Checklist with explicit gates, source-of-truth links, and a single "blocked by" summary | workspace landing, campaign detail, cockpit |

Reference primitives to reuse (no new design work):

- `bb-panel`, `bb-surface-inset`, `bb-surface` tokens — from Brain Phase 2/4.
- `MarketingHero`-style layered backdrop primitives only where appropriate (landing only).
- `SectionShell`, `SectionIntro` patterns from `src/components/marketing/` for visual cadence.
- Existing `CommandPalette`, `Breadcrumbs`, `useHeaderOffset` — keep.

## 5. Demote to read-only / admin-only / future

| Surface | Move to |
|---|---|
| `WorkspaceResetPreviewPage` | Dev flag or superadmin |
| Workspace `agents` | Merge into admin agent management (admin-only) |
| Workspace `runs` | Tab inside Campaign detail; standalone becomes read-only mirror |
| Workspace `supervisor` | Sub-tab of Cockpit |
| Legacy `home`, `knowledge` redirects | Keep silent; remove from any remaining UI references |
| Internal language leaks (Phase/Slice/Bridge/etc.) | Renamed or hidden in product chrome |

## 6. Visual unification targets

- Adopt the Brain workspace's panel chrome (`bb-panel`, inset surfaces) for
  all list and detail headers.
- Standardize the page header strip (title, scope chip, primary action) using
  a single primitive — Phase 3 introduces it; Phase 4 applies it to
  cockpit and supervisor.
- Empty-state primitive shared across all list pages.
- Settings sectioned shell mirrors the Brain Governance tab layout.
- Token compliance: no arbitrary hex; no Tailwind `text-white` / `bg-black`;
  reuse semantic tokens from `index.css`.

## 7. Phased roadmap

Each phase is its own approval. Each ships its own audit/fix pair. None
introduce new product capabilities.

### Phase 1 — IA & navigation cleanup
- Sidebar reorganized to the §1.1 groups (Build / Operate / Insight / Connect / Settings).
- `runs`, `agents`, `supervisor`, `templates` removed from primary sidebar; folded into Cockpit and Library shells (shells are nav-only in this phase — pages still exist where they are).
- ⌘K palette aligned to new IA; demoted ghost routes hidden.
- Breadcrumbs reflect the new hierarchy.
- Workspace landing gains a readiness strip (rendered from existing `useClientReadiness`).
- Client scope chip added globally to workspace chrome.
- Internal-language leak grep + renames (no new copy beyond what the audit catalogs).
- No page restructures, no schema, no new routes.

### Phase 2 — Setup / onboarding flow redesign
- Workspace landing becomes the canonical setup hub with the §2 checklist.
- New-workspace state shows the 8-step setup journey.
- ASC wizard repositioned as the default path from Campaigns → New.
- Empty-state primitive applied to every list surface.
- BB ingest and Integrations connection deep-linked into the checklist.
- No new routes; no new capabilities.

### Phase 3 — Page-type unification
- Library shell merges Guides + Templates + Blueprints with a typed picker; sub-routes preserved as redirects.
- Workspace guide vs Guides precedence made explicit in UI (which wins, where).
- Settings sectioned shell ships (Workspace / Brand / Readiness / Members / Advanced).
- Connect shell ships, surfacing workspace integrations + relevant admin connector instances behind a scope chip.
- Notifications split into Log + Config tabs.
- Dispositions surfaces effective access source.
- Form builder surfaces campaign assignment inline.
- Forms / clients / integrations detail pages standardize on the detail pattern.

### Phase 4 — Operator cockpit + live workflow polish
- Cockpit shell merges Live + Supervisor + Runs as tabs.
- Readiness/preconditions panel surfaces blockers before going live.
- Campaign detail gains Readiness + Runs tabs.
- QA queue gains disposition + campaign context links.
- Analytics scoped explicitly to workspace; cross-tenant deep-link to admin.
- Supervisor view promoted (out of demoted state) as a cockpit tab.

### Phase 5 — Final coherence, a11y, regression sweep
- Mirrors the Business Brain Phase 5 model: audit-first, categorized fix pass, screenshot set, regression baseline restored.
- Token sweep, focus ring sweep, landmark uniqueness, tap targets, color-only signal fixes.
- Empty/error/permission state parity across all surfaces.
- `docs/dashboard-consolidation-phase5-audit.md` produced.
- Program closeout note in `OUTLINE.md`.

## 8. Constraints — apply to every later phase

- No backend / schema / RLS / edge-function changes unless a phase explicitly opens them.
- No new product capabilities introduced by IA/UX changes alone.
- Regression baseline preserved before a phase is marked done.
- Marketing site, Trust/Security/legal pages, and Business Brain sub-IA are not touched by this program.
- Each phase stops at an approval gate; no jumping ahead.

## 9. Stop-gate for Phase 0

After this doc + the audit + OUTLINE/plan updates, stop and present:

- audit highlights (critical/high),
- proposed roadmap (§7),
- explicit list of items that look like feature gaps rather than IA/UX fixes (audit §8).

Await explicit approval before starting Phase 1.

— End of plan —
