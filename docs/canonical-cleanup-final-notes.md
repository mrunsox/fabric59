# Canonical Cleanup — Final Notes (Phase 13)

This document captures the recon, design, and final state of the canonical strip — the final pass that completes the canonical convergence work started in Phase 11 (PR #1) and Phase 12 (PR #2).

---

## Part 0 — Recon (state going in)

### Real workspaces (Phase 2B status: already shipped before this pass)

- `workspaces` table exists (`20260512185840`), columns: `id, organization_id, name, slug, is_default, created_at, updated_at`. ON DELETE CASCADE on organization.
- `workspace_members` exists with `workspace_role` enum (`owner | admin | manager | member | viewer`).
- Helper RPCs: `is_workspace_member(_user_id, _workspace_id)` and `get_user_workspace_ids(_user_id)` — both with a transitional `organization_members` fallback.
- RLS policies on both tables: members read; org admins manage.
- Backfill: one `is_default = true` workspace per existing organization.
- Auto-create trigger on `organizations` INSERT spawns a default workspace.
- Real entity tables already workspace-scoped: `campaigns` (`workspace_id NOT NULL`), `guides`, `forms`, `workspace_ai_configs`.
- `WorkspaceContext.tsx` (Phase 2B implementation) — real loader: reads `workspaces` table, scoped by RLS, returns `{workspace, workspaces, organizationId, refetch}`. The Phase 2A org-as-workspace adapter was already removed in commit `a64b71e` lineage.

**Conclusion for this pass:** Part 1 of the user's brief ("Replace workspace-as-org adapter with real workspaces") is **already done**. The remaining workspace-binding gap is in `clients` (still on `tenants` table, only org-scoped). The canonical spec keeps `tenants` as the DB-level table — workspace ownership of clients is an additive `workspace_id` column with mirror trigger, queued as Phase 2B follow-up. I will add a minimal additive `workspace_id` to `tenants` to make the workspace shell honest end-to-end for clients, **without** renaming or restructuring `tenants` (per the "DB stays tenant*" rule).

### Mock/preview surfaces (pre-pass)

- `src/pages/admin/AbandonRatePage.tsx` — `skillAuditData`, `ivrAnalysis` arrays + fake toasts. Banner added in Phase 12.
- `src/pages/admin/ANIBlockListPage.tsx` — `MOCK_BLOCKED` + fake history. Banner added in Phase 12.
- `src/pages/admin/CallbackQueuePage.tsx` — `MOCK_SKILLS`, `MOCK_IVR_MODULES`, `MOCK_ANNOUNCEMENTS`. Banner added in Phase 12.
- Routes for the three above are mounted in `App.tsx` and listed in `AdvancedRoutesPage.tsx` under "Archived — Operations".

**Decision:** Per the spec's "if not, and the product direction is to NOT ship these in v1: de-route them, delete the components and constants, remove them from /superadmin/routes and any internal menus." None of the three has a real backend planned in the canonical spec — they are pre-canonical operational dashboards. **De-route + delete components + delete constants + drop from AdvancedRoutesPage.**

### Compat-only workspace routes (pre-pass)

- `/app/workspaces/:id/qa-legacy` — mounts `QAAnalyticsPage` (org-level admin page). Canonical: `/app/workspaces/:id/qa` with `WorkspaceQaPage`.
- `/app/workspaces/:id/analytics-legacy` — mounts `ReportsPage`. Canonical: `/app/workspaces/:id/analytics` with `WorkspaceAnalyticsPage`.
- `/app/workspaces/:id/integrations-legacy` — mounts `ConnectorsCatalogPage`. Canonical: `/app/workspaces/:id/integrations` with `WorkspaceIntegrationsPage`.

The canonical equivalents all have workspace-aware data hooks (`useWorkspaceQa`, `useWorkspaceAnalytics`, `useWorkspaceIntegrations`). The `-legacy` routes have not appeared in primary nav since Phase 8.

**Decision:** Hard-remove. The grace window has elapsed and the canonical surfaces are live.

### Compat-only admin routes (pre-pass)

- `/admin/script-routing` and `/admin/tree-editor/:scriptId` — VAULTED imports already removed in PR #1, routes redirect to `/admin/scripts`. Already gone in effect; the `Navigate` shims can stay for one more release for deep-link safety.
- `/admin/campaigns/readiness`, `/admin/campaigns/event-log` — de-surfaced from primary nav but still routed. **Keep** — these are operational ops surfaces referenced from Five9 ops hubs and the canonical spec preserves them.
- `/admin/scriptflow/:scriptId` — VAULTED, kept as deep-link compat. **Keep.**
- `/admin/call-flow/:scriptId` — VAULTED, kept as deep-link compat. **Keep.**
- `/admin/qa-legacy` — does not exist (qa-legacy only existed inside the workspace shell).

### Demo-hiding heuristics

- `src/lib/demoHeuristic.ts` — `isDemoName()` and `partitionDemo()` helpers. Pattern: `(test|demo|sandbox|please_ignore)|^old_`.
- Usage: `WorkspaceHomePage.tsx` filters campaigns/guides/templates/forms/clients to hide demo rows from the user.

**Decision:** Once the cleanup RPC physically deletes the matching rows, the frontend filter is masking nothing real. **Remove the `WorkspaceHomePage` filter.** Keep the helper (it stays useful for ad-hoc dev needs and CLI scripting), but stop applying it to user surfaces.

### Existing reset surface

- `WorkspaceResetPreviewPage` at `/app/workspaces/:workspaceId/reset` — read-only preview only. Explicit docstring: "G2 (next): destructive reset action with typed workspace-name confirmation."
- RPC `preview_workspace_demo_data(_workspace_id uuid)` exists, returns per-table counts.

**Decision:** This pass is the G2 the page promises. Extend the page in-place with the destructive flow (preview → typed confirm → execute → results), and add a `reset_workspace_demo_data` RPC that mirrors the preview heuristic.

---

## Part 1 — Real workspaces (delta in this pass)

Most work was already done. This pass adds the final missing piece:

### Additive workspace scoping on `tenants` (clients)

- New migration: `tenants.workspace_id uuid NULL REFERENCES public.workspaces(id) ON DELETE SET NULL` + index.
- Backfill: each existing tenant assigned to its organization's default workspace (`workspaces.is_default = true`).
- RLS unchanged. No destructive moves. `tenants.organization_id` retained as the canonical ownership root; `workspace_id` is a co-scope used by `WorkspaceClientsPage`.
- Mirror trigger on `tenants` INSERT/UPDATE assigns `workspace_id` from the org default if unset.

This is purely additive. Pages that read `tenants` org-wide continue to work; pages that scope by workspace now have a real column.

---

## Part 2 — Destructive cleanup (the new work)

### New RPC: `reset_workspace_demo_data(_workspace_id uuid, _confirm_token text)`

- Heuristic identical to `preview_workspace_demo_data`: name matches `(test|demo|sandbox|please_ignore)` OR starts with `old_`.
- Requires explicit `_confirm_token` argument that must equal the workspace's `name` (case-insensitive, trimmed). If mismatch: raise exception, no rows touched.
- SECURITY DEFINER, but **requires** `is_org_owner_or_admin(auth.uid(), w.organization_id) OR is_master_admin(auth.uid())`. Plain org members cannot trigger.
- Deletes inside a single transaction, per-table:
  - `forms` where `workspace_id = _workspace_id` and name matches
  - `guides` where `workspace_id = _workspace_id` and name matches
  - `campaigns` where `workspace_id = _workspace_id` and name matches
  - `templates` where `organization_id = workspace.organization_id` and name matches
  - `tenants` where `organization_id = workspace.organization_id` and name matches (defers cascading FKs to existing ON DELETE chains)
- Logs to new `canonical_cleanup_audit` table: actor user_id, workspace_id, organization_id, predicate, started_at, ended_at, per-table counts (before/deleted), heuristic.
- Returns `jsonb` with `audit_id`, deleted counts per table, organization_id, workspace_id, heuristic.

### New audit table: `canonical_cleanup_audit`

```
id uuid PK
actor_id uuid NOT NULL (auth.uid())
workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
predicate text NOT NULL
heuristic text NOT NULL
started_at timestamptz NOT NULL DEFAULT now()
ended_at timestamptz NOT NULL DEFAULT now()
counts jsonb NOT NULL  -- {tenants: {scanned, deleted}, campaigns: {…}, …}
```

RLS: `SELECT` allowed for org owners/admins of the workspace org, plus master admins. `INSERT` only via SECURITY DEFINER RPC.

### UI

`WorkspaceResetPreviewPage` becomes a two-state page:

1. **Preview state** (existing): counts per table from `preview_workspace_demo_data`. Adds "Delete junk data" CTA gated to org owners/admins.
2. **Confirm state**: typed-text input requiring the user to type the workspace name to enable the destructive button. Lists the predicate and counts again.
3. **Result state**: shows per-table deleted counts + a link to view the audit row.

### Remove the masking heuristic

`WorkspaceHomePage` stops filtering with `isDemoName`. After cleanup runs the deletions are real, so the filter is no longer hiding live junk — it would only ever hide rows the user themselves chose not to delete. Showing them is the honest UI.

---

## Part 3 — Final legacy strip

### Routes removed in this pass

| Removed | Why |
|---|---|
| `/app/workspaces/:id/qa-legacy` | Canonical `/qa` live since Phase 8 |
| `/app/workspaces/:id/analytics-legacy` | Canonical `/analytics` live since Phase 8 |
| `/app/workspaces/:id/integrations-legacy` | Canonical `/integrations` live since Phase 7 |
| `/admin/abandon-rate` | Mock-only, not in canonical spec, not in primary nav |
| `/admin/ani-blocklist` | Mock-only, not in canonical spec, not in primary nav |
| `/admin/callback-queue` | Mock-only, not in canonical spec, not in primary nav |

### Files deleted

- `src/pages/admin/AbandonRatePage.tsx`
- `src/pages/admin/ANIBlockListPage.tsx`
- `src/pages/admin/CallbackQueuePage.tsx`

### Catalog updates

- `AdvancedRoutesPage`: remove the three mock entries from "Archived — Operations".
- `surfaceAudit.ts`: drop the three workspace `-legacy` rows.
- `canonicalSurfaces.test.ts`: drop `integrations-legacy`, `qa-legacy`, `analytics-legacy` from `COMPATIBILITY_ONLY`.
- `OutlinePage`: add Phase 13 entry; keep historical Phase 8/D notes since they reflect the pre-removal state.

### Routes deliberately kept (with explicit reason)

- `/admin/script-routing` — VAULTED, deep-link compat for legacy script-routing URLs. Cost: a `Navigate` shim.
- `/admin/tree-editor/:scriptId` — VAULTED, deep-link compat.
- `/admin/scriptflow/:scriptId` — VAULTED, deep-link compat.
- `/admin/call-flow/:scriptId` — VAULTED, deep-link compat.
- `/admin/agent-dashboard`, `/admin/supervisor` — active ops surfaces; not in primary nav but referenced from Five9 operational flows.
- `/admin/campaigns/readiness`, `/admin/campaigns/event-log` — referenced from Five9 ops; canonical spec preserves.
- `/admin/qr-routing`, `/admin/data-plane`, `/admin/identity`, `/admin/utilities`, `/admin/monitoring`, `/admin/testing`, `/admin/automations`, `/admin/feedback`, `/admin/training`, `/admin/goals`, `/admin/kb`, `/admin/summary-templates`, `/admin/email-templates` — operational admin surfaces with real data wiring (not mocks); kept de-surfaced from primary nav per Phase 11.

---

## Part 4 — Mock data removal (delta)

The three mock pages (Abandon Rate, ANI Block List, Callback Queue) are completely removed in this pass. Their constants (`MOCK_SKILLS`, `MOCK_IVR_MODULES`, `MOCK_ANNOUNCEMENTS`, `MOCK_BLOCKED`, `skillAuditData`, `ivrAnalysis`) cease to exist with the page deletions.

No other canonical surface ships mock data after this pass.

---

## Part 5 — Acceptance state

After this pass:

1. **Workspace truth:** Real `WorkspaceContext` (already), real `workspaces` and `workspace_members` tables (already), canonical entity tables `workspace_id`-scoped (campaigns/guides/forms/integrations: already; clients/tenants: now).
2. **Junk cleanup:** Live destructive RPC behind typed confirmation, with per-table count preview and an immutable audit row.
3. **Legacy strip:** Three workspace `-legacy` routes gone; three mock-only admin routes gone; canonical surfaces are the single source of truth.
4. **No fake data:** Zero mock arrays remain in user-reachable pages.
5. **Docs:** This file + Phase 13 entry in `/outline`.
