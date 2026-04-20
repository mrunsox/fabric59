

# Wire the Refactor — Routes, Runtime, Legacy Bridge, Sidebar

The components and tables from the prior plan exist. This plan **wires them up**, completes the runtime refactor, adds the missing pieces, and shuts down the legacy path.

## What's already in place (no rebuild needed)
- DB schema extensions: `five9_campaign_routes.connection_id / campaign_type / call_variable_group_id`, validation trigger, `legal_connect_disposition_mappings.campaign_id`, `five9_call_variable_groups.scope`
- Client-level UI: `ClientLegalConnectPage` + `ProviderConnectionCard` + 3 wizards + `WebhookSettingsPanel` + `ProviderPoliciesPanel` + `FieldMappingPanel` + `ConnectionHealthPanel`
- Campaign-level UI: 6 panels under `src/components/campaign-overlay/`

## What this plan adds / changes

### 1. Route wiring (`src/App.tsx`)
Add inside the `/admin` block:
- `clients/:clientId/legal-connect` → `ClientLegalConnectPage`
- `clients/:clientId/legal-connect/setup/:provider` → `ClientLegalConnectPage`
- `clients/:clientId/five9-overlay` → new `CampaignOverlayListPage`
- `clients/:clientId/five9-overlay/campaigns/:campaignRouteId` → new `CampaignOverlayPage`

### 2. New page shells
**`src/pages/admin/CampaignOverlayListPage.tsx`** — campaign route cards for this client (uses `five9_campaign_routes` filtered by `client_id`); each card links to detail; CTA "Create campaign route" opens an inline form; empty-state CTA.

**`src/pages/admin/CampaignOverlayPage.tsx`** — tabbed shell (Routing · Variables · Dispositions · Policies · Simulation · Health) wrapping the existing `CampaignXxxPanel` components, scoped to one `campaignRouteId`. No provider credential fields anywhere. Header shows: client name, campaign name, connected provider badge (with "Not connected — go to Legal Connect" CTA when missing).

### 3. Sidebar / client overview entry points
**`src/components/layout/AdminLayout.tsx`** — keep the global "Legal Connect" link (system-admin global view) but rename label to "Legal Connect (Global)" to reduce confusion.

**`src/pages/admin/ClientOverviewPage.tsx`** — add two prominent action cards:
- "Legal Connect" → `clients/:id/legal-connect`
- "Five9 Overlay (Campaigns)" → `clients/:id/five9-overlay`

### 4. Runtime refactor — `legal-connect-jobs`
Replace the hardcoded `if (provider === "clio") / "mycase"` chain with provider-registry dispatch.

- Register `clioAdapter`, `mycaseAdapter`, `smokeballAdapter` instances against `provider-registry.ts` via a single `_shared/register-adapters.ts` (imported at the top of every consumer)
- `executeJob(supabase, job)` → load `legal_connect_connections` by `job.connection_id` (preferred) or `(client_id, provider)`; resolve adapter via `getAdapter(connection.provider)`; pass `connection` (not raw `integration_configs`) to adapter calls
- Smokeball becomes reachable; future providers slot in by registry registration only
- Legacy fallback: if no `legal_connect_connections` row exists, call `legacyConfigBridge.resolveProviderConnection(clientId, provider)` (read-through only) and log a deprecation warning into `legal_connect_event_log`

### 5. Runtime refactor — `five9-overlay-test`
- Delete the `stubAdapter`
- Resolve real adapter via `getAdapter(provider)` from registry
- Honor `dryRun: boolean` in request body — when true, orchestrator skips actual `apiFetch` calls and returns the planned chain only (the orchestrator already supports this)
- Returns: `{ normalized, route, action_chain, execution: { dryRun, results } }`

### 6. Legacy bridge — `src/lib/legal-connect/legacyConfigBridge.ts` (new)
Pure read-through helper, no writes:
```
resolveProviderConnection(clientId, provider): Promise<LegalConnectConnectionDraft | null>
```
- First tries `legal_connect_connections` (preferred)
- Falls back to `tenants.integration_configs.{clio|mycase}` and projects into a `LegalConnectConnectionDraft` shape
- New saves are routed exclusively through `useCreateLegalConnection` (already in place)
- Server-side mirror: `supabase/functions/_shared/legacy-config-bridge.ts` for use by `legal-connect-jobs`

### 7. Deprecate legacy CRM wizard
**`src/components/admin/CrmIntegrationWizard.tsx`** — top-of-card deprecation banner:
> "This setup is moving to Client → Legal Connect. [Open Legal Connect →] [Migrate now]"

"Migrate now" reads `integration_configs.{clio|mycase}` for the current tenant, calls `useCreateLegalConnection` to create the new row, then stamps `integration_configs.{provider}.migrated_at = <iso>`. Stays usable behind `?legacy=true`; nav links removed.

### 8. Demote in-page Five9 Overlay tab
**`src/pages/admin/LegalConnectPage.tsx`** — remove `five9` tab entry (DomainRouting / CallVariables / Disposition / Simulation / Health are now per-campaign). Keep `connections / campaigns / policies / mappings / sync / review / reliability / ai / testing / logs` as the **system-admin global cross-client view**. Add a banner: "For per-client provider setup, open the client's Legal Connect tab."

### 9. Empty states & gating already covered by existing components
- `CampaignRoutingPanel` already filters provider dropdown to connected providers and shows the "Connect provider first" CTA
- `CampaignSimulationPanel` already disables run when no connection exists
- `ProviderConnectionCard` already shows secret-missing state
Verify these remain correct after wiring; no rebuild expected.

### 10. Seeds (one insert)
Single seed via insert tool (idempotent on conflict):
- 1 starter call variable group `"Default Intake Group"` with scope=`'client'` per existing tenant that has any `legal_connect_connections` row (creates a reusable template)
- 5 starter dispositions in `legal_connect_disposition_mappings` per connection, `campaign_id = NULL` (client-default fallback): Qualified Lead, Existing Client Inquiry, Callback, Wrong Number, Needs Review
- No provider credentials seeded

### 11. Files touched

**New (3):**
- `src/pages/admin/CampaignOverlayListPage.tsx`
- `src/pages/admin/CampaignOverlayPage.tsx`
- `src/lib/legal-connect/legacyConfigBridge.ts`
- `supabase/functions/_shared/legacy-config-bridge.ts`
- `supabase/functions/_shared/register-adapters.ts`

**Edited (5):**
- `src/App.tsx` — add 4 routes
- `src/components/layout/AdminLayout.tsx` — rename global link
- `src/pages/admin/ClientOverviewPage.tsx` — add 2 entry cards
- `src/pages/admin/LegalConnectPage.tsx` — drop `five9` tab + banner
- `src/components/admin/CrmIntegrationWizard.tsx` — deprecation banner + Migrate button
- `supabase/functions/legal-connect-jobs/index.ts` — registry dispatch + bridge fallback
- `supabase/functions/five9-overlay-test/index.ts` — real adapter + dryRun

**1 seed insert** (no schema change).

### 12. Out of scope (honest)
- Real OAuth handshake still needs `CLIO_CLIENT_ID/SECRET`, `SMOKEBALL_CLIENT_ID/SECRET`, `MYCASE_WEBHOOK_SECRET` set in secrets — wizards remain in "stubbed activate" mode until those are set; Connect buttons surface the missing-secret state via existing logic
- Cron registration for Clio token refresh — surfaced as manual "Refresh now" button (already present in `ClientLegalConnectPage` health area)
- Per-tab role gating beyond what `user_has_permission` already enforces

### Acceptance
- Visiting `/admin/clients/:id/legal-connect` shows provider connect flow (no campaign UI)
- Visiting `/admin/clients/:id/five9-overlay/campaigns/:routeId` shows campaign tabs with no secret/auth fields
- Campaign provider dropdown only lists connected providers for that client
- `legal-connect-jobs` dispatches Clio, MyCase **and** Smokeball via the registry
- `five9-overlay-test` calls real adapters (dry-run by default)
- Legacy `CrmIntegrationWizard` shows deprecation banner with one-click migration
- `LegalConnectPage` no longer hosts the campaign-scoped Five9 Overlay tab

