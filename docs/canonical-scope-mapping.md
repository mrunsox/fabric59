# Canonical Scope Mapping (Phase D close-out)

Single source of truth mapping each canonical entity → DB table → route → implementation status after Phase D legacy de-surfacing.

## Workspace surfaces (canonical)

| Entity | DB table(s) | Route | Status |
| --- | --- | --- | --- |
| Home | `workspaces`, derived | `/w/:id/home` | ✅ canonical |
| Campaigns | `campaigns`, `campaign_drafts` | `/w/:id/campaigns`, `/w/:id/campaigns/new`, `/w/:id/campaigns/:campaignId` | ✅ canonical |
| Guides | `scripts`, `script_versions` | `/w/:id/guides`, `/w/:id/guides/:guideId/edit` | ✅ canonical |
| Forms | `forms`, `form_versions` | `/w/:id/forms`, `/w/:id/forms/new`, `/w/:id/forms/:formId/edit` | ✅ canonical (Phase C) |
| Templates | `script_templates` | `/w/:id/templates` | ✅ canonical |
| Clients | `tenants` | `/w/:id/clients` | ✅ canonical |
| Dispositions | `dispositions`, `disposition_access` | `/w/:id/dispositions` | ✅ canonical (Phase B) |
| Notifications | `notifications`, `post_call_automations` | `/w/:id/notifications` (Deliveries + Post-call rules tabs) | ✅ canonical (Phase B + D merge) |
| Knowledge | `knowledge_base` | `/w/:id/knowledge` | ✅ canonical |
| Assistant | `assistant_*` | `/w/:id/assistant` | ✅ canonical |
| QA | `qa_reviews` | `/w/:id/qa` | ✅ canonical |
| Analytics | derived | `/w/:id/analytics` | ✅ canonical |
| Integrations | `integration_configs` | `/w/:id/integrations` | ✅ canonical |
| Settings | `workspaces`, `tenants` | `/w/:id/settings` | ✅ canonical |
| Agent cockpit | `call_sessions` | `/w/:id/agent` | 🟡 stub mounted (Phase B) |
| Runs / Agents / Supervisor | various | `/w/:id/runs`, `/w/:id/agents`, `/w/:id/supervisor` | 🟡 demoted (mounted, hidden from primary nav, reachable via ⌘K) |

## Org / admin surfaces

| Surface | Route | Status |
| --- | --- | --- |
| Overview | `/admin` | ✅ canonical |
| Workspaces | `/admin/workspaces` | ✅ canonical |
| Connectors | `/admin/connectors` | ✅ canonical (replaces `/admin/integrations`, `/admin/five9`) |
| Reports | `/admin/reports` | ✅ canonical |
| Notifications | `/admin/notifications` | ✅ canonical |
| Settings | `/admin/settings` | ✅ canonical |
| Billing | `/admin/billing` | ✅ canonical |

## Superadmin surfaces

| Surface | Route | Status |
| --- | --- | --- |
| Overview | `/superadmin` | ✅ canonical |
| Organizations | `/superadmin/workspaces` | ✅ canonical |
| Users | `/superadmin/users` | ✅ canonical |
| Design Partners | `/superadmin/design-partners` | ✅ canonical |
| Legal Connect Reports | `/superadmin/legal-connect-reports` | ✅ canonical |
| Feature Vault | `/superadmin/vault` | ✅ canonical |
| Source Exports | `/superadmin/exports` | ✅ canonical |
| Advanced Routes | `/superadmin/routes` | ✅ canonical |
| System Docs | `/superadmin/docs` | ✅ canonical |
| Dev Guide | `/superadmin/dev-guide` | ✅ canonical |
| Test cases | `/superadmin/test-cases` | ✅ canonical |
| Call Flow | `/superadmin/call-flow` → `/admin/connectors` | 🟠 redirecting (raw at `/superadmin/call-flow/raw`) |

## Phase D — de-surfaced & deleted

Files deleted (Gate 3 — proven zero references outside `surfaceAudit.ts` strings):

| File | Replacement route |
| --- | --- |
| `src/pages/admin/ANIBlockListPage.tsx` | `/admin/ani-blocklist` → `/admin/settings` |
| `src/pages/admin/AbandonRatePage.tsx` | `/admin/abandon-rate` → `/admin/settings` |
| `src/pages/admin/CallbackQueuePage.tsx` | `/admin/callback-queue` → `/admin/settings` |
| `src/pages/admin/QrRoutingPage.tsx` | `/admin/qr-routing` → `/admin/settings` |
| `src/pages/admin/CampaignOverlayPage.tsx` | `/admin/clients/:id/five9-overlay/...` → `/admin/campaigns` |
| `src/pages/admin/CampaignOverlayListPage.tsx` | `/admin/clients/:id/five9-overlay` → `/admin/campaigns` |

## Phase D — retained, redirect-only

Files retained on disk but their canonical entry point is a silent redirect.

| File | Route | Reason |
| --- | --- | --- |
| `src/pages/admin/PostCallAutomationsPage.tsx` | `/admin/automations` → `/w/:workspaceId/notifications` | Re-exports `PostCallAutomationsContent` consumed by the Post-call rules tab. |
| `src/pages/admin/Five9OverviewPage.tsx` | `/admin/five9` → `/admin/connectors/five9` | Reachable via `/admin/five9/overview` for deep links. |
| `src/pages/admin/DataPlanePage.tsx` | `/admin/data-plane` → `/superadmin` | Raw at `/admin/data-plane/raw`. |
| `src/pages/admin/IdentityResolutionPage.tsx` | `/admin/identity` → `/superadmin` | Raw at `/admin/identity/raw`. |
| `src/pages/admin/PlatformUtilitiesPage.tsx` | `/admin/utilities` → `/superadmin` | Raw at `/admin/utilities/raw`. |
| `src/pages/admin/CallFlowPage.tsx` | `/superadmin/call-flow` → `/admin/connectors` | Raw at `/superadmin/call-flow/raw`. |
| `src/pages/admin/ScriptBuilderPage.tsx` | `/admin/scripts/:scriptId/builder` | Retained — referenced by canonical workspace guide editor. |
| `src/pages/admin/ScriptEditorPage.tsx` | `/admin/scripts` | Retained — canonical org-level guide entry. |

## Verification

Run `bun run scripts/audit-routes.ts` to print the live redirect table from `App.tsx`.
Regression locks live in `src/test/regressions/canonicalScopeAlignment.test.ts`.
