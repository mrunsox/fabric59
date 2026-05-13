
# Fabric59 — Hard Delete Cleanup (single slice)

Default action everywhere below: **delete**. Anything kept is justified inline.

## 1. Routes — App.tsx surgery

### A. Delete routes outright (no redirect)
- `/demo` → `DemoSandboxPage` (off-message, not in canonical IA).
- `/faq` → `FaqPage` (off-message; canonical info lives in marketing IA).
- `/admin/agent-dashboard`, `/admin/supervisor` (deep-linked legacy, not in canonical nav, no compatibility need).
- `/admin/campaigns/readiness`, `/admin/campaigns/event-log` (compatibility-only carve-outs from old phases — collapse into `/admin/campaigns` + `/admin/monitoring`).
- `/admin/scripts/:id` (alias of `/admin/scripts`; only `/admin/scripts` and `/admin/scripts/:scriptId/builder` survive).
- `/admin/agent-dashboard`, `/admin/supervisor`, `/admin/automations` (legacy — superseded by canonical workspace QA/analytics + `/admin/legal-connect` operational hubs). Keep `/admin/qa`, `/admin/billing`, `/admin/automations` only if outline still classifies them canonical; otherwise delete. Decision: delete `agent-dashboard` and `supervisor`; keep `qa`, `billing`, `automations`.
- Multi-hop redirects: `/admin/scripts` legacy alias chain (`scripter → scripts`, `scriptflow → scripts`, `tree-editor → scripts`, `call-flow → flows`) — these are already single-hop; **keep** per user policy.
- `/master/*` redirects → keep `/master`, `/master/users`, `/master/vault` (likely bookmarks). Delete `/master/exports`, `/master/routes`, `/master/docs`, `/master/vault/:id`, `/master/organizations` (obscure).
- `/admin/dev-guide`, `/admin/settings/dev-guide` redirects — delete (obscure, internal-only).
- `/onboarding/legal-connect` → `/admin/legal-connect` redirect — delete (obscure, no nav).
- `/feature-vault`, `/vault` redirects — keep `/vault` only (bookmarked); delete `/feature-vault`.
- `/five9-domains` → `/admin/domains` — delete (`/domains` already covers it).
- `/legal-connect/overview` redirect — delete (obscure; `/legal-connect` covers it).
- `/call-flow` top-level redirect → delete (no nav; superadmin route reachable directly).
- `/admin/qa-legacy` style routes inside `/app/workspaces/*` — deleted with shell teardown below.

### B. `/app/workspaces/*` legacy shell — collapse to single-hop redirects
- Delete the entire `<Route path="/app/workspaces/:workspaceId" element={<LegacyWorkspaceShell />}>` block (App.tsx lines 436–491) and its child routes.
- Replace with **one** catch-all redirect: `/app/workspaces/:workspaceId/*` → `/w/:workspaceId/*` (single-hop, preserves deep paths via `useParams` + `Navigate replace`).
- Keep `/app/workspaces` index → `WorkspacesIndexPage` (canonical workspaces picker — same component as `/w` index but at the historical URL). Update `WorkspacesIndexPage` link target from `/app/workspaces/${id}/home` to `/w/${id}/home`.
- Delete `src/components/layout/WorkspaceShell.tsx` (LegacyWorkspaceShell — no other consumers).
- Delete `WorkspaceSectionPlaceholder.tsx` import + file (only mounted under legacy shell).

### C. Retained redirects (final list, every one single-hop)
Justified survivors only:
| Redirect | Target | Why kept |
|---|---|---|
| `/dashboard` | `/admin` | High-bookmark probability |
| `/settings` | `/admin/settings` | High-bookmark |
| `/vault` | `/superadmin/vault` | Internal team bookmark |
| `/five9` | `/admin/five9` | Operational shortcut |
| `/domains` | `/admin/domains` | Operational shortcut |
| `/legal-connect` | `/admin/legal-connect` | Operational shortcut |
| `/master` | `/superadmin` | Migration bookmark |
| `/master/users` | `/superadmin/users` | Migration bookmark |
| `/master/vault` | `/superadmin/vault` | Migration bookmark |
| `/admin/integrations` | `/admin/connectors` | Phase-1 alias, still likely typed |
| `/admin/dashboard` | `/admin` | Phase-11 collapse |
| `/admin/tenants` | `/admin/clients` | Label rename |
| `/admin/scripter` | `/admin/scripts` | Vaulted alias |
| `/admin/scriptflow` | `/admin/scripts` | Vaulted alias |
| `/admin/tree-editor` | `/admin/scripts` | Vaulted alias |
| `/admin/tree-editor/:scriptId` | `/admin/scripts` | Compatibility deep-link (outline-listed) |
| `/admin/script-routing` | `/admin/scripts` | Compatibility deep-link (outline-listed) |
| `/admin/call-flow` | `/admin/flows` | Vaulted alias |
| `/admin/campaigns/overview` | `/admin/campaigns` | Phase-B collapse |
| `/admin/campaigns/drafts` | `/admin/campaigns?status=draft` | Phase-B collapse |
| `/admin/campaigns/archived` | `/admin/campaigns?status=archived` | Phase-B collapse |
| `/admin/campaign-blueprints` | `/admin/templates` | Phase-B collapse |
| `/admin/five9/legacy` | `/admin/five9` | Phase-1 collapse |
| `/admin/five9/campaign-builder*` | `/admin/campaigns/new` | Vaulted |
| `/onboarding/workspace` | `/onboarding` | Phase-2 collapse |
| `/app/workspaces/:workspaceId/*` | `/w/:workspaceId/*` | Legacy shell teardown (this slice) |

Everything else listed in section A is deleted.

## 2. Source files deleted

- `src/components/layout/WorkspaceShell.tsx`
- `src/pages/DemoSandboxPage.tsx`
- `src/pages/FaqPage.tsx`
- `src/pages/workspace/WorkspaceSectionPlaceholder.tsx`
- `src/pages/admin/AgentDashboardPage.tsx` (route deleted)
- `src/pages/admin/SupervisorPage.tsx` (route deleted)
- `src/pages/admin/CampaignReadinessBoardPage.tsx`
- `src/pages/admin/CampaignEventLogPage.tsx`
- `src/pages/admin/Five9Page.tsx` if it's a pure re-export of `Five9OverviewPage` (verify during execution; delete + rewire route)
- `src/pages/admin/WorkspaceCanonicalPlaceholder.tsx` (legacy placeholder, no route)
- `src/pages/auth/WorkspaceBootstrapPage.tsx` (no longer routed; commented as "kept for history" — delete now)
- Legacy `src/pages/LandingPage.tsx` if any — verify; delete if only referenced by tests, then drop the test.
- Update `src/data/surfaceAudit.ts` — remove `/app/workspaces/*` entries, add deletion notes; or delete the file if no longer surfaced anywhere (verify with `rg`).

For each deletion: `rg` for imports, remove from App.tsx, drop nav references (`src/config/navigation.ts`).

## 3. Workspace integrations — finalize canonical, delete stubs

### Routes (already canonical)
- Live: `/w/:workspaceId/integrations`, `/w/:workspaceId/integrations/:connectionId`, `/admin/connectors`, `/admin/connectors/:slug`.
- Delete: `/app/workspaces/:workspaceId/integrations-legacy` route comes out automatically with the legacy shell teardown. Per user note this was listed as "compatibility-only" — overridden by the shell teardown decision; the canonical workspace integrations page already has parity.

### Stub edge functions to DELETE
After verifying no caller references in `src/` and no active webhook URLs in `tenants.integration_configs`:
`abacuslaw, actionstep, adobe-sign, asana, calendly, casetext, cosmolex, darrow-ai, diligen, docusign, dropbox, dynamics-365, fastcase, fieldpulse, filevine, google-calendar, google-chat, google-drive, google-workspace, harvey-ai, hellosign, housecall-pro, hubspot, jobber, lastpass, lawpay, leap, lexis-ai, microsoft365, monday, netdocuments, nordpass, oncehub, onedrive, power-automate, practicepanther, quickbooks, quoteiq, ringcentral, smokeball, smokeball-oauth-callback, spellbook, westlaw, zendesk, zenmaid, zoho-crm, zoom-meeting`

Use `supabase--delete_edge_functions` after deleting the source folders.

### Live providers (canonical set)
`clio, mycase, five9, slack, zapier, make` — Zapier/Make are webhook URL providers (no edge function); the rest have live functions (`clio*`, `mycase`, `five9*`, `slack-agent`).

### Provider DB row purge
- `integration_providers` currently has only `clio` seeded. Insert/upsert the remaining canonical 5: `mycase, five9, slack, zapier, make`.
- Delete any other rows that don't match the canonical 6.

### CTA/UI cleanup
- `rg "admin/connectors"` inside `src/pages/workspace src/components/workspace` already returns no matches per prior phase — re-verify; remove any new ones.

## 4. Data purge — workspace clients

### Schema migration (option 2 — strict, no backfill)
```sql
ALTER TABLE public.tenants ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_tenants_workspace_id ON public.tenants(workspace_id);
-- Do NOT backfill. Existing 156 tenants stay NULL.
```
RLS update: existing org-membership policy stays (org admins still see all org tenants in `/admin/clients`). The strictness happens **in the workspace query**, not in RLS.

### Hook update
Update `useWorkspaceClients` to filter `workspace_id = :workspaceId`. `/admin/clients` continues to read all org tenants (org-scoped surface, intentional).

### Demo row purge
Hard delete from `tenants` where `name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_'` (4 rows confirmed via `psql`). Cascade orphans:
```sql
DELETE FROM public.campaigns WHERE client_id IN (<doomed ids>);
DELETE FROM public.guides WHERE source_id IN (...) AND source_type = 'script' AND ...;
DELETE FROM public.tenants WHERE name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_';
```
Also purge matching rows in `campaigns`, `guides`, `forms`, `templates` whose `name` matches the same heuristic AND has no live workspace owner.

### Stale `integration_connections` / `integration_mappings`
Delete rows whose `provider_id` is NOT in the canonical 6.

## 5. Outline + memory updates
- Update `src/pages/OutlinePage.tsx` (or wherever the runtime outline lives) — reflect: legacy shell removed, integrations canonical, demo data purged, canonical provider list = Clio/MyCase/Five9/Slack/Zapier/Make (drop "Dial" wording).
- Update `mem://architecture/api-routing` and `mem://features/ui-managed-integrations` if they mention `/app/workspaces` as live.
- Add a fresh memory: `mem://architecture/canonical-routes-final` summarizing the locked route map.

## 6. Verification
- `rg "/app/workspaces"` in `src` returns 0 hits outside the redirect line, `WorkspacesIndexPage` (now updated to `/w`), and `surfaceAudit.ts` (or that file's deleted).
- `rg "DemoSandboxPage|FaqPage|LegacyWorkspaceShell|AgentDashboardPage|SupervisorPage|CampaignReadinessBoardPage|CampaignEventLogPage|WorkspaceSectionPlaceholder"` returns 0 hits.
- Typecheck via build (auto-run by harness).
- Visit `/w/<id>/clients` — must show empty state (no tenants assigned).
- Visit `/admin/clients` — still shows the 152 real tenants minus the 4 deleted demo rows.
- `psql "SELECT count(*) FROM tenants WHERE workspace_id IS NULL"` → 152 (unchanged real tenants).
- `psql "SELECT count(*) FROM tenants"` → 152 (4 demo rows gone).

## 7. Out of scope (explicit blockers for next slice)
- Real workspace assignment UX (a "Move client to workspace" action). Not built this slice; the 152 unassigned tenants will only be visible via `/admin/clients` until reassigned.
- OAuth round-trip QA per provider (already noted blocker).
- Marketing IA fact-check vs the deleted `/demo` and `/faq` (any inbound link inside marketing copy will need a follow-up).

## Required report-back structure
After execution I will report exactly per the user's spec: routes deleted, source files deleted, data purged (with rule + counts), integrations cleanup (provider list + deleted functions), retained compatibility items (table above), and any blockers hit.
