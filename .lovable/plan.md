# Outline + Data Convergence Report — Workspace Slice (May 14)

Scope: Implementation slice. Closes the route-family editorial gap, lands workspace-strict scoping for Runs and Agents, and promotes shared UI primitives (`ActionCard`, `RecentList`) consumed by Workspace Home, Campaigns, and Guides.

## What shipped

### 1. Outline editorial correction
- Added a new top-of-doc section `0. Route-family editorial correction (May 14)` to `src/pages/OutlinePage.tsx` declaring:
  - **Canonical workspace family:** `/w/:workspaceId/*` (rendered by `CanonicalWorkspaceShell`).
  - **Compatibility alias:** `/app/workspaces/:workspaceId/*` is a single-hop redirect; no nav/CTA targets it.
  - **Org/admin shell relationship:** `/admin/*` (AdminShell) remains the canonical org surface. `/org/*` (OrgShell) is an internal forward-canonical scaffold, **not** promoted to canonical org status by this doc. A future slice must either adopt `/org/*` as canonical with `/admin/* → /org/*` redirects, or retire the scaffolding.
  - **Workspace data scoping:** `deployment_runs` and `agents` now carry `workspace_id`; workspace Runs/Agents pages filter strictly by it.
- Added `R-20: /app/workspaces/:workspaceId/* → /w/:workspaceId/*` to `REDIRECT_TABLE` in `src/data/surfaceAudit.ts`.

### 2. Workspace-strict Runs / Agents
- Migration `add_workspace_id_to_runs_and_agents`:
  - `deployment_runs.workspace_id uuid → workspaces(id) ON DELETE SET NULL`, indexed.
  - Backfill from `deployments.owner_scope_id WHERE owner_scope_type='workspace'`, then fall back to the org's default workspace for any remaining rows.
  - `agents.organization_id` and `agents.workspace_id` added (nullable), indexed. Existing agent rows remain unscoped (NULL) until provisioning is updated to assign workspace.
- Rewrote `WorkspaceRunsPage.tsx` as a native canonical surface that queries `deployment_runs` with `.eq("workspace_id", workspace.id)`. No more wrapper around the org-level RunsPage. Caveat banner removed.
- Rewrote `WorkspaceAgentsPage.tsx` as a native canonical surface that queries `agents` with `.eq("workspace_id", workspace.id)`. No more wrapper around the org-level AgentsPage. Caveat banner removed. Empty state now points users to org-level provisioning + workspace assignment as the follow-up path.

### 3. UI primitive extraction
- New `src/components/common/ActionCard.tsx` — canonical create/CTA tile (icon, label, hint, optional trailing icon). Promoted from inline composition on `WorkspaceHomePage`.
- New `src/components/common/RecentList.tsx` — canonical recent-items list (title, meta, href). Falls back to shared `EmptyState` when empty. Promoted from inline composition on `WorkspaceHomePage`.
- Adopted on:
  - `WorkspaceHomePage.tsx` — Create grid uses `ActionCard`, Recent section uses `RecentList`.
  - `WorkspaceCampaignsPage.tsx` — `ActionCard` quick-create tile rendered above the table when items exist.
  - `WorkspaceGuidesPage.tsx` — `ActionCard` quick-create tile rendered above the list when items exist.

## Category grades (this slice)

| # | Category | Prior | Now | Reason |
|---|---|---|---|---|
| A | Workspace nav order vs outline §4 | PASS | PASS | Unchanged. |
| B | Workspace shell mount completeness | PASS | PASS | Unchanged. |
| C | Terminology (no user-facing "Tenant") | PASS | PASS | Unchanged. |
| D | Canonical primitives available | PASS | PASS | Now includes `ActionCard` + `RecentList` alongside `KpiCard`/`EmptyState`/`StatusBadge`/`WorkspacePageHeader`. |
| **E** | **Workspace home compliance** | PARTIAL | **PASS** | Visual composition uses canonical primitives only. Route-family compliance now declared canonical at `/w/:workspaceId/*` by the outline editorial correction; the documented divergence is closed. |
| **F** | **UI primitive convergence** | PARTIAL | **PASS** | Create-action tile + recent-items list extracted into `ActionCard`/`RecentList`. Adopted on Home, Campaigns, Guides. |
| G | Supervisor framing | PASS | PASS | Unchanged. |
| **H** | **Runs/Agents framing** | PARTIAL | **PASS** | Both pages are now native canonical surfaces with workspace-strict queries. Caveat banners removed. |
| I | Legacy redirect hygiene | PASS | PASS | `/app/workspaces/*` alias documented in REDIRECT_TABLE (R-20). |
| J | Demo-data hygiene on home | PASS | PASS | Unchanged. |
| **K** | **Outline vs live route-family mismatch** | PARTIAL | **PASS** | Closed by the May 14 editorial correction declaring `/w/:workspaceId/*` canonical and `/app/workspaces/*` compatibility-only. |

## Redirect + Compatibility Check (current)

Workspace family
- Canonical live route: `/w/:workspaceId/*` (CanonicalWorkspaceShell)
- Documented canonical route: `/w/:workspaceId/*` ✓ (post-correction)
- Compatibility alias: `/app/workspaces/:workspaceId/*` → `/w/:workspaceId/*` (R-20, single-hop)
- Status: aligned.

Org / admin family
- Canonical live route per outline §0/§1/§3: `/admin/*` (AdminShell). ✓
- Internal scaffold: `/org/*` (OrgShell) — mounted, not canonical, no redirect bridge yet.
- Status: documented as an open decision in §0; not a silent divergence.

## Remaining gaps (carried forward)

1. **Org/admin shell decision still owed.** `/admin/*` and `/org/*` coexist; the outline's §0 names this and asks the next slice to choose adoption or retirement.
2. **Agent workspace assignment in provisioning.** The org-level `Quick Provision` flow does not yet write `workspace_id` on new agents. Until it does, the workspace Agents page will read empty for net-new agents from that flow. Tracked as the follow-up to this slice.
3. **Legacy agent rows are unscoped.** `agents.workspace_id IS NULL` for pre-existing rows. They are intentionally not surfaced in any workspace; org-level `/admin/agents` remains the compatibility surface.
4. **Outline body still references `/app/workspaces/...`** in historical sections. Per §0 these are retained for traceability and read as historical; no rewrite was performed in this slice to keep diff scope tight.

## Proposed next slice

**Org-shell decision + agent workspace assignment in provisioning.**
1. Pick `/admin` vs `/org` as the canonical org family. Either (a) update outline §1/§3 to adopt `/org/*` and add `/admin/* → /org/*` single-hop redirects, or (b) retire OrgShell and remove the `/org/*` mount. Closes Gap #1.
2. Update `useProvisioning` and the org `Quick Provision` form to write `workspace_id` (and `organization_id`) on new `agents` rows; offer a workspace selector when the user is in an org-level context. Closes Gap #2 and starts to drain Gap #3.
3. Optional cleanup pass on the outline body to swap historical `/app/workspaces/...` route strings for canonical `/w/...` strings now that §0 declares the family — purely editorial, low risk.
