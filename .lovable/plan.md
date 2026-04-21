

# Fabric59 Refactor — Integration Core + Superadmin Feature Vault

Reposition Fabric59 as a focused **Five9-native integration configurator** while preserving every existing non-core module inside a Superadmin-only **Feature Vault** with downloadable source bundles.

**Scope discipline**: nothing in this plan exists outside the integration configurator core or the Feature Vault. No new dashboards, no new AI surfaces, no new analytics, no marketing changes, no nice-to-have utilities.

---

## Phase 1 — Isolate the integrations core

### Navigation rewrite

Replace `src/config/navigation.ts` with the 10-item customer-facing nav:

```text
Overview · Workspaces · Clients · Five9 · Connectors ·
Flows · Deployments · Runs · Templates · Settings
```

Add `src/config/superadmin-navigation.ts` (master-admin only): `Overview · Feature Vault · Source Exports · Advanced Routes · System Docs`.

Every archived route stays mounted in `App.tsx` — only nav links disappear. Direct URLs still work for staff.

### Ownership model (first-class)

Migration adds `five9_ownership_mode` enum (`client` | `workspace`) to `organizations` and `tenants` (nullable on tenants = inherit from org). Backfill existing rows to `workspace`.

Onboarding gains one required question: **"Who owns the Five9 account?"** — answer drives downstream scoping. New helper `src/lib/five9/resolveOwnership.ts` returns `{ mode, domainId, ownerScope }` for any client + flow context.

### Top-level pages (10)

| Section | Page(s) | Built from |
|---|---|---|
| Overview | `OverviewPage` | rename of `UserDashboardPage` + ownership-aware widgets |
| Workspaces | `WorkspacesPage`, `WorkspaceDetailPage` | new — lists `organizations`, shared Five9, workspace templates |
| Clients | `ClientsPage`, `ClientWorkspacePage` | reuse `TenantsPage` + `ClientOverviewPage` |
| Five9 | `Five9Page` (tabs: Connections/Campaigns/Variables/Dispositions) | reuse `Five9OverviewPage`, `DomainsPage`, `CampaignsPage`, `DispositionsPage`, `CampaignBuilderPage` |
| Connectors | `ConnectorsCatalogPage`, `ConnectorInstancePage` | new shell; reuses `LegalConnectPage` connection cards + Webhook/Custom-HTTP |
| Flows | `FlowsPage`, `FlowBuilderPage` | new (model below) |
| Deployments | `DeploymentsPage`, `DeploymentDetailPage` | new |
| Runs | `RunsPage`, `RunDetailPage` | unified view over `five9_event_log` + `legal_connect_sync_jobs` + `deployment_runs` |
| Templates | `TemplatesPage`, `TemplateDetailPage` | new |
| Settings | `SettingsPage` | reuse existing + "Advanced Routes" link for staff |

### Flow / Deployment data model

```sql
flows                -- id, org_id, name, trigger_type, definition jsonb, version, status
flow_versions        -- id, flow_id, version, definition jsonb, created_by, created_at
flow_templates       -- id, org_id (nullable=global), name, definition jsonb, category
deployments          -- id, flow_id, flow_version, client_id, scope jsonb, status, created_at
deployment_runs      -- id, deployment_id, trigger_event_id, status, started_at, finished_at, error
```

All RLS-scoped to `organization_id`.

### Flow Builder (linear, Phase 1)

Step-based builder (no React Flow yet):

- **Trigger** — Five9 event type (`call_end`, `disposition`, `callback_request`, `variable_change`, `webhook`)
- **Filters** — workspace/client/domain/campaign/queue/disposition/variable predicates
- **Mapping** — source → target field rows with simple transforms
- **Action** — connector + action (Clio create matter, MyCase task, Webhook POST, etc.)
- **Failure policy** — retry count, fallback action

Serialized into `flows.definition`. Runtime is the existing `legal-connect-jobs` edge fn plus a thin new `flow-runner` wrapper that loads a deployment, evaluates filters, applies mappings, dispatches to the connector.

---

## Phase 2 — Superadmin Feature Vault

### New tables

```sql
vault_features    -- id, slug, name, status (core|archived|experimental|deprecated|extracted),
                  --   summary, reason_archived, original_routes text[], frontend_files text[],
                  --   backend_files text[], db_objects text[], edge_functions text[],
                  --   dependencies jsonb, required_secrets text[], risks text, restore_notes text,
                  --   extraction_notes text, archived_at, archived_by
vault_exports     -- id, feature_id, version, manifest jsonb, bundle_path, size_bytes, created_at, created_by
```

New private storage bucket `vault-exports` for generated `.zip` bundles.

### Superadmin pages

- `SuperadminOverviewPage` — vault entry count, last export, status breakdown
- `FeatureVaultPage` — table of `vault_features` with filters + "Generate export" button
- `FeatureVaultDetailPage` — manifest view + docs preview + export history
- `SourceExportsPage` — list of `vault_exports` with signed download URLs
- `AdvancedRoutesPage` — listing every route in the app (including archived)
- `SystemDocsPage` — moves `DocsHubPage` content here

### Export generator (`vault-export` edge fn)

1. Reads a `vault_features` row
2. Fetches every file listed in `frontend_files` + `backend_files`
3. Generates docs (`overview.md`, `routes.md`, `schema.md`, `dependencies.md`, `extraction-notes.md`) by templating the row
4. Builds `manifest.json`
5. Zips into `frontend/ backend/ docs/ manifest.json`
6. Uploads to `vault-exports` bucket; inserts `vault_exports` row

---

## Phase 3 — Agent Lifecycle preservation (first vault entry)

Seed `vault_features` with a complete entry for **Agent Lifecycle**:

- **Frontend**: `AgentsPage`, `AgentDashboardPage`, `SupervisorPage`, `components/agents/onboarding/*`, `components/agents/offboarding/*`, `hooks/useProvisioning.ts`, `useDeprovisioning.ts`, `useFive9Sync.ts`, `types/provisioning.ts`, `types/deprovisioning.ts`
- **Backend**: `five9-provisioning`, `slack-agent`, `send-credentials`, `google-workspace`, `send-hr-notification`
- **DB**: `agents`, `provisioning_history`, `deprovisioning_audit` + RLS
- **Secrets**: `FIVE9_USERNAME`, `FIVE9_PASSWORD`, `SLACK_API_KEY`, Google Workspace creds

Generate the first export bundle and verify download end-to-end before Phase 4.

---

## Phase 4 — Archive remaining non-core modules

Seed `vault_features` rows (one per module) for: Scripts/ScriptFlow/TreeEditor/CallFlow stack · QA Analytics · Training · KB · Reports · Billing · Goals · Campaign Blueprints · Legacy Campaign Intake · ANI Block · Callback Queue · Abandon Rate · Mapping Builder (visual) · Partners · Feedback · Design System · Data Plane · Identity Resolution.

Same manifest → docs → export pipeline. No code deleted; only nav entries removed.

`CampaignIntakePage` redirects to `/admin/five9/campaign-builder` (the only true deprecation).

---

## Files

**New (~30):**
- `src/config/navigation.ts` (rewrite) + `src/config/superadmin-navigation.ts`
- `src/lib/five9/resolveOwnership.ts`
- `src/pages/admin/{Overview,Workspaces,WorkspaceDetail,Clients,Five9,ConnectorsCatalog,ConnectorInstance,Flows,FlowBuilder,Deployments,DeploymentDetail,Runs,RunDetail,Templates,TemplateDetail}Page.tsx`
- `src/pages/superadmin/{Overview,FeatureVault,FeatureVaultDetail,SourceExports,AdvancedRoutes,SystemDocs}Page.tsx`
- `src/components/flows/{TriggerStep,FilterStep,MappingStep,ActionStep,FailureStep,FlowSummary}.tsx`
- `src/components/vault/{VaultEntryCard,ExportHistoryTable,ManifestViewer}.tsx`
- `supabase/functions/flow-runner/index.ts`
- `supabase/functions/vault-export/index.ts`

**Edited (~6):**
- `src/App.tsx` — register new routes (keep all archived routes mounted)
- `src/pages/OnboardingPage.tsx` — Five9 ownership question
- `src/components/auth/MasterProtectedRoute.tsx` — wrap superadmin routes
- `src/pages/admin/CampaignIntakePage.tsx` — redirect to Campaign Builder
- `src/pages/admin/SettingsPage.tsx` — "Advanced Routes" link for staff
- `src/integrations/supabase/types.ts` — auto-regenerated

**Migrations (3):**
1. Add `five9_ownership_mode` enum + columns; backfill `workspace`
2. Create `flows`, `flow_versions`, `flow_templates`, `deployments`, `deployment_runs` + RLS
3. Create `vault_features`, `vault_exports` + master-admin RLS + `vault-exports` storage bucket

---

## Out of scope (explicit)

- Visual node-based flow canvas (linear builder only)
- Per-end-customer OAuth (workspace-owned credentials only)
- Auto-rebuilding archived modules from bundles (export only)
- Deleting any archived code or tables
- Marketing site changes
- New AI surfaces beyond what already exists
- Any feature not on the spec above

---

## Acceptance

- Main nav shows only the 10 customer-facing sections; superadmin nav appears for master admins
- Onboarding asks "Who owns Five9?" and the answer scopes deployments
- A user can: create a flow → assign a connector action → deploy scoped to a client+disposition → see runs in the Runs page
- Every archived route still resolves at its original URL (no 404s)
- Superadmin can open Feature Vault → Agent Lifecycle → Generate Export → download a working `.zip` (frontend/, backend/, docs/, manifest.json)
- All remaining non-core modules have vault entries with downloadable bundles after Phase 4

