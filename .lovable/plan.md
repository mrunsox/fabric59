# Fabric59 — Reposition + Legacy Strip + Canonical Build

Authoritative program plan. Approved scope and gates:

- Cleanup Phases 1–3 must land green before any Phase 4+ work begins.
- Phases 4, 5, 6, 7 are each independently gated for approval.
- No Supabase schema / RLS / migration changes anywhere in this program.
- No mounted compatibility route removed beyond the explicit delete list.
- Every deleted page becomes a redirect tombstone, never a 404.
- Regression tests updated in the same change that removes the underlying code.
- Untouchable files: `src/integrations/supabase/types.ts`, `src/integrations/supabase/client.ts`, `.env`, `supabase/config.toml`.

Open-question answers (locked):
- Legacy tombstones: `WorkspaceResolveRedirect` for authenticated users; unauthenticated users land on `/app/workspaces` (never a login loop with a dead destination).
- Phases 4 → 7 ship with independent per-phase approval gates.

---

## Phase 0 — Audit Register + Compatibility Surface Manifest

This phase is **documentation only**. No file or route changes here. Phase 1 executes the deletions.

### A. Deletion Register

Files to delete in Phase 1:

| # | Path | Replacement |
|---|------|-------------|
| 1 | `src/pages/admin/ArchivedCampaignsPage.tsx` | Already unrouted (line 436 redirects to `/admin/campaigns?status=archived`). File is dead on disk; delete. |
| 2 | `src/pages/admin/CampaignBlueprintsPage.tsx` | Already unrouted (line 437 redirects to `/admin/templates`). File is dead on disk; delete. |
| 3 | `src/pages/admin/CallFlowBuilderPage.tsx` | Already unrouted (line 455 redirects via WorkspaceResolveRedirect to `/w/:workspaceId/guides`). File is dead on disk; delete. |
| 4 | `src/pages/superadmin/FeatureVaultPage.tsx` | Route `/superadmin/vault` → `<Navigate to="/superadmin/docs" replace />`. |
| 5 | `src/pages/superadmin/FeatureVaultDetailPage.tsx` | Route `/superadmin/vault/:id` → `<Navigate to="/superadmin/docs" replace />`. |
| 6 | `src/pages/superadmin/SourceExportsPage.tsx` | Route `/superadmin/exports` → `<Navigate to="/superadmin/docs" replace />`. |

Files explicitly listed in the brief but **already absent on disk** (vaulted in earlier passes — no further file action needed, tombstones already in place):

- `src/pages/admin/ScripterPage.tsx` → tombstone at line 451.
- `src/pages/admin/ScriptFlowHubPage.tsx` → tombstone at line 452.
- `src/pages/admin/TreeEditorPage.tsx` → tombstones at lines 453 and 489.
- `src/pages/admin/CampaignsOverviewPage.tsx` → tombstone at line 401.
- `src/pages/admin/CampaignDraftsPage.tsx` → tombstone at line 402.

### B. Compatibility-Surface Manifest

Routes the brief calls out, with current status and Phase-1 action:

| Route | Current state | Phase 1 action |
|-------|---------------|----------------|
| `/superadmin/vault` | Mounts `FeatureVaultPage` (App.tsx:323) | Replace with `<Navigate to="/superadmin/docs" replace />` |
| `/superadmin/vault/:id` | Mounts `FeatureVaultDetailPage` (324) | Replace with `<Navigate to="/superadmin/docs" replace />` |
| `/superadmin/exports` | Mounts `SourceExportsPage` (325) | Replace with `<Navigate to="/superadmin/docs" replace />` |
| `/master/vault` | Redirects `/superadmin/vault` (305) | Repoint to `/superadmin/docs` |
| `/vault` | Redirects `/superadmin/vault` (308) | Repoint to `/superadmin/docs` |
| `/admin/scripter` | `WorkspaceResolveRedirect → /w/:id/guides` (451) | Keep — already canonical |
| `/admin/scriptflow` | `WorkspaceResolveRedirect → /w/:id/guides` (452) | Keep |
| `/admin/tree-editor` | `WorkspaceResolveRedirect → /w/:id/guides` (453) | Keep |
| `/admin/tree-editor/:scriptId` | `WorkspaceResolveRedirect → /w/:id/guides` (489) | Keep |
| `/admin/call-flow-builder` | `WorkspaceResolveRedirect → /w/:id/guides` (455) | Keep |
| `/admin/call-flow` | `WorkspaceResolveRedirect → /w/:id/guides` (454) | Keep |
| `/admin/campaigns/overview` | `Navigate → /admin/campaigns` (401) | Keep |
| `/admin/campaigns/drafts` | `Navigate → /admin/campaigns?status=draft` (402) | Keep |
| `/admin/campaigns/archived` | `Navigate → /admin/campaigns?status=archived` (436) | Keep |
| `/admin/campaign-blueprints` | `Navigate → /admin/templates` (437) | Keep |
| `/analytics-legacy` | **Not mounted** | Add tombstone: `WorkspaceResolveRedirect → /w/:workspaceId/analytics` (fallback `/app/workspaces` for unauthenticated) |
| `/qa-legacy` | **Not mounted** | Add tombstone: `WorkspaceResolveRedirect → /w/:workspaceId/qa` |
| `/integrations-legacy` | **Not mounted** | Add tombstone: `WorkspaceResolveRedirect → /w/:workspaceId/integrations` |
| `/app/workspaces/:id/*` | `LegacyWorkspaceRedirect → /w/:id/*` (507) | Keep — bookmark compat |
| `/master/*`, `/org/*` | Various `Navigate` / `OrgParamRedirect` (303–525) | Keep — bookmark compat |
| `/admin/agent-dashboard` | `WorkspaceResolveRedirect → /w/:id/agent` (457) | Keep |

Mounted routes that the brief explicitly says to **keep untouched** are not re-listed; they continue to exist as today.

### C. Non-page Vault references to scrub

Strip every Feature Vault / `vault_features` / `vault_exports` reference (except auto-generated `src/integrations/supabase/types.ts`, which is untouchable):

- `src/config/navigation.ts`
- `src/config/feature-playbooks.ts`
- `src/data/surfaceAudit.ts`
- `src/pages/OutlinePage.tsx`
- `src/pages/workspace/WorkspacesIndexPage.tsx`
- `src/test/regressions/superadminSurface.test.ts`
- `src/test/regressions/canonicalSurfaces.test.ts`

### D. Pass 2B nav-config finalization (queued in Pass-1 plan)

- Drop `surfaced` field from `WorkspaceNavItem` type and every `WORKSPACE_SECTIONS` entry.
- Migrate `OutlinePage` and `WorkspacesIndexPage` from `WORKSPACE_SECTIONS` → `WORKSPACE_NAV` (`src/config/canonicalNav.ts`).
- Delete the `WORKSPACE_SECTIONS` export.

### E. Verification gate for Phase 0 → Phase 1

- This document committed.
- `WorkspaceResolveRedirect` confirmed to handle unauthenticated users by sending them to `/app/workspaces` (the canonical workspaces picker). If it does not today, Phase 1 will adjust the helper before any tombstone uses it.

---

## Phase 1 — Legacy Strip (deletions + tombstones)

1. Delete the 6 files in Section A.
2. `src/App.tsx`:
   - Remove `FeatureVaultPage`, `FeatureVaultDetailPage`, `SourceExportsPage` imports.
   - Replace `/superadmin/vault`, `/superadmin/vault/:id`, `/superadmin/exports` route bodies with `<Navigate to="/superadmin/docs" replace />`.
   - Repoint `/master/vault` and `/vault` redirects to `/superadmin/docs`.
   - Add the three new tombstones: `/analytics-legacy`, `/qa-legacy`, `/integrations-legacy` (each `WorkspaceResolveRedirect` with the unauth fallback to `/app/workspaces`).
3. Verify `WorkspaceResolveRedirect` unauth fallback. If it currently sends to `/login` (or similar) without a sane post-login destination, change the helper to fall back to `/app/workspaces`.
4. Scrub Section C non-page vault references.
5. Execute Section D Pass-2B finalization.
6. Update regression tests in the same edits that remove their fixtures (`superadminSurface`, `canonicalSurfaces`) — flip vault assertions from "present" to "absent" and switch `WORKSPACE_SECTIONS` assertions to `WORKSPACE_NAV`.

**Verification:** `rg "FeatureVault|vault_features|vault_exports|WORKSPACE_SECTIONS|ArchivedCampaignsPage|CampaignBlueprintsPage|CallFlowBuilderPage" src/` returns only `src/integrations/supabase/types.ts` (and possibly App.tsx tombstone comments — text only, no live import). Regression suite green.

---

## Phase 2 — Industry-Agnostic Chrome

Audit and neutralize hardcoded "law firm" copy in app shell, workspace nav labels, generic onboarding strings, integration catalog headings, empty states, command palette, and `SuperadminOverviewPage`. Replace with provider / workspace / client / campaign language. Legal vocabulary is permitted **only** in:
- Legal starter templates (template content).
- Legal integration config screens (Clio / MyCase / Smokeball setup).
- `/solutions/legal-answering-services` marketing page.

Group Clio / MyCase / Smokeball under a "Legal practice management" family in the integration catalog UI, with a "More integration packs coming" placeholder for future verticals.

---

## Phase 3 — Marketing Copy Rewrite

Copy-only updates (no structural changes):
- **Home (`HomePage.tsx`)** — hero: *"Five9 handles the call. Fabric59 is the brain. Your client's system of record holds the outcome."* Multi-vertical positioning throughout.
- **`/product` (`ProductTourPage.tsx`)** — organize around the 4 canonical questions: Who called? What happened? What was the outcome? Who needs to be notified?
- **`/solutions/virtual-receptionists`** — emphasize medical, financial, legal, property management, professional services.
- **`/solutions/legal-answering-services`** — preserved as-is.
- **`/integrations` index + sub-pages** — group by vertical family. Legal: Clio (launch), MyCase (roadmap), Smokeball (roadmap). Placeholder section for future verticals.
- **`/pricing`** — reframe tiers in provider-operations language (workspaces / campaigns / seats).
- **Confirmation pass** — verify `SuperadminOverviewPage` and `SystemDocsPage` contain no vault stats and no hardcoded firm chrome.

### Cleanup gate (Phases 1 + 2 + 3 → Phase 4)

Deliverable bundle before any Phase 4 work:
1. Deletion register confirming every file removed and every route tombstoned.
2. Updated compatibility-surface manifest.
3. Rewrite confirmation: one-line summary per page changed.
4. Clean bill of health: no vault references, no hardcoded law-firm chrome in shell, all regression tests passing, all canonical surfaces intact.

---

## Phase 4 — Canonical Guide Builder (gated approval)

Route: `/app/workspaces/:workspaceId/guide`

Section-based structured editor. Sections: greeting, business overview, service descriptions, practice areas / specialties, hours & holiday rules, callback policy, escalation contacts, special handling notes, FAQs, exceptions / no-go rules, internal notes. All section labels configurable per workspace. Legal Firm Starter guide template seeds the standard law-firm structure. Draft → publish workflow with version history. Read-only render mode for the runner.

**Technical:** new components under `src/components/guide-builder/`; extend types in `src/types/guide-content.ts`; reuse existing `useWorkspaceGuides` and `useGuideVersions` hooks. No DB changes.

---

## Phase 5 — Canonical Flow Builder (gated approval)

Route: `/app/workspaces/:workspaceId/campaigns/:campaignId/builder`

Schema-driven node/step builder replacing every legacy React Flow surface. Step types: question/branch, information display, field capture, outcome/disposition, escalation trigger, notification trigger, end flow. Conditional logic: if/then branching, multi-condition groups, show/hide rules, jump-to-step, required-field enforcement. Field types: short text, long text, phone, email, single select, multi select, checkbox, date/time, numeric, address, disposition selector, urgency selector, notification-target selector, AI-summary field, hidden/system field. Draft → publish → version. Agent preview mode. Clone / duplicate. Output field mapping to integration destinations.

**Technical:** new `src/components/flow-builder-v2/`. Normalized schema in `src/types/flow.ts`. Existing `templates.content` JSONB stores the schema. Builder is schema-in / schema-out; the runtime executor lives in Phase 6.

---

## Phase 6 — Canonical Live Call Runner (gated approval)

Route: `/app/agent/workspace`

Three-panel layout: Guide (left) | Decision-tree form (center) | AI copilot (right). Session header: workspace name, campaign name, call start time, ANI (when available from Five9). Step executor with autosave on every step, required-field enforcement, inline validation, keyboard-first nav, graceful refresh / disconnect recovery. AI copilot uses existing `assistant-chat` and `workspace-assistant` edge functions for suggested answer, next-best-question, draft summary, likely outcome, suggested notification targets, source attribution, and helpful / not-helpful feedback capture. Minimal-latency rendering.

---

## Phase 7 — Submission → Output Pipeline (gated approval)

On submit:
1. Create `InteractionRecord` (existing `call_sessions` + `call_outcomes`).
2. Contact match against workspace contacts.
3. Dispatch via canonical CRM adapter (`five9-main` → Clio / MyCase / Smokeball).
4. Fire notification engine using outcome + practice area / specialty + urgency + workspace rules.
5. Write sync log; push failures to exception queue with non-blocking retry.

All existing edge functions and tables — no schema changes.

---

## Status

- Phase 0: **complete** (this document).
- Phase 1: ready to execute.
- Phases 2 – 7: queued behind their gates.
