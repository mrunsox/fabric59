

# Refactor: Separate Client-Level Connections from Campaign-Level Five9 Overlay

This refactor enforces a clean two-layer model: **Client owns provider connections, auth, secrets, webhooks.** **Campaign owns Five9 routing, variables, dispositions, action mapping.** No mixing in UI, data flow, or runtime.

## What changes

### 1. Information Architecture (routes & nav)

**Client-level (under `/admin/clients/:clientId/`):**
- `legal-connect/connections` — provider cards (Clio / MyCase / Smokeball) with connect/reconnect/disconnect/test
- `legal-connect/setup/:provider` — guided per-provider setup wizard
- `legal-connect/webhooks` — webhook subscriptions, secrets, last event, renewal
- `legal-connect/policies` — provider-level defaults (auto-create, dup prevention, fallback)
- `legal-connect/field-mappings` — Fabric59 ↔ provider field map per connected provider
- `legal-connect/health` — connection health, sync history, errors

**Campaign-level (under `/admin/clients/:clientId/campaigns/:campaignId/overlay/`):**
- `routing` — Five9 domain/campaign/queue/DNIS → this client + provider target picker (only lists already-connected providers)
- `variables` — assign call variable group, required/optional, labels, validation
- `dispositions` — allowed dispositions for this campaign + action-chain mapping
- `policies` — campaign overrides for callback, screen-pop, review-fallback
- `simulation` — test payloads (dry-run + real), preview action chain
- `health` — campaign-scoped event log only

**Removed/relocated:** the current "Five9 Overlay" tab in `LegalConnectPage` is split — domain routing, variables, dispositions, simulation move under campaign; connections, webhooks, policies stay at client level.

### 2. UI Components

**New (client-level):**
- `src/components/legal-connect/ProviderConnectionCard.tsx` — status, last sync/event/error, action buttons
- `src/components/legal-connect/wizards/ClioConnectWizard.tsx` — intro → scopes → OAuth → callback → capability detect → field map → test → activate
- `src/components/legal-connect/wizards/MyCaseConnectWizard.tsx` — intro → API token → capability probe → field map → test → activate
- `src/components/legal-connect/wizards/SmokeballConnectWizard.tsx` — intro → region → OAuth → callback → capability detect → field map → test → activate
- `src/components/legal-connect/WebhookSettingsPanel.tsx` — per-provider subscription, secret display, renewal, last event
- `src/components/legal-connect/ProviderPoliciesPanel.tsx` — client-level defaults
- `src/components/legal-connect/FieldMappingPanel.tsx` — per-provider mapping editor
- `src/components/legal-connect/ConnectionHealthPanel.tsx` — health/history/errors
- `src/pages/admin/ClientLegalConnectPage.tsx` — tabbed shell for the above

**New (campaign-level):**
- `src/pages/admin/CampaignOverlayPage.tsx` — tabbed shell
- `src/components/campaign-overlay/CampaignRoutingPanel.tsx` — replaces `DomainRoutingPanel`, scoped to one campaign; **provider target dropdown only lists this client's connected providers**
- `src/components/campaign-overlay/CampaignVariablesPanel.tsx` — assign group + required-rules editor (refactored from `CallVariablesPanel`)
- `src/components/campaign-overlay/CampaignDispositionsPanel.tsx` — refactored from `DispositionMappingPanel`, scoped to campaign
- `src/components/campaign-overlay/CampaignPoliciesPanel.tsx` — campaign overrides only (no auto-create at provider level — that's client)
- `src/components/campaign-overlay/CampaignSimulationPanel.tsx` — pre-fills campaign context, **disabled with CTA "Connect provider first" if target provider not connected**
- `src/components/campaign-overlay/CampaignHealthPanel.tsx` — filtered event log

**Reused (no change to API):** `ProviderCapabilityBadge`, `EventReplayDialog`, `useFive9Overlay` hook (extended to accept `campaignId` filter)

**Demoted/removed from `LegalConnectPage`:**
- "Five9 Overlay" tab → now lives under each campaign
- Existing combined `DomainRoutingPanel` / `CallVariablesPanel` / `DispositionMappingPanel` / `SimulationPanel` / `Five9HealthPanel` → kept only as system-admin global views (read-only cross-tenant)

### 3. Data Model Changes (1 migration)

**Extend `five9_campaign_routes`:**
- `client_id` (uuid, NOT NULL) — ties campaign to client
- `provider_target` (text, NULLABLE) — `'clio' | 'mycase' | 'smokeball'`, references a connected provider
- `connection_id` (uuid, NULLABLE, FK → `legal_connect_connections.id`) — explicit pointer to the connection used at runtime
- `campaign_type` (text, NULLABLE) — `'intake' | 'existing_client_support' | 'callback' | 'consult_booking' | 'other'`
- `call_variable_group_id` (uuid, NULLABLE, FK → `five9_call_variable_groups.id`)
- Constraint: when `provider_target` is set, `connection_id` must reference a connection of that provider for the same `client_id` (enforced via trigger)

**Extend `legal_connect_disposition_mappings`:**
- `campaign_id` (uuid, NULLABLE, FK → `five9_campaign_routes.id`) — campaign-scoped overrides, falls back to client-default when null

**Extend `five9_call_variable_groups`:**
- `scope` (text, default `'campaign'`) — `'client'` or `'campaign'`; client-scoped groups become reusable templates

**No new tables.** All existing tables stay; relationships sharpen.

### 4. Runtime Resolution Refactor

Update `supabase/functions/_shared/five9-router.ts`:
1. Receive Five9 event → extract domain/campaign/queue/DNIS
2. Resolve `five9_campaign_routes` row → get `client_id`, `provider_target`, `connection_id`, `call_variable_group_id`
3. Load `legal_connect_connections` row by `connection_id` (single source of truth — never read provider creds from `tenants.integration_configs`)
4. Load campaign-scoped variables + dispositions; fall back to client-level defaults where not overridden
5. Build action chain via `disposition-mapping-engine`
6. Execute via `provider-registry` adapter with `connection_id` context
7. Log to `five9_event_log` with both `client_id` and `campaign_id`

**Bridge for legacy `integration_configs`:** new helper `resolveProviderConnection(clientId, provider)` — checks `legal_connect_connections` first, falls back to legacy `tenants.integration_configs` only if a feature flag `LEGACY_CRM_FALLBACK=true` is present. Logs a deprecation warning per resolution.

### 5. Refactor `legal-connect-jobs` dispatcher

Drop hardcoded `if (provider === "clio")` chain. Replace with `getAdapter(connection.provider)` from `provider-registry.ts`. Smokeball becomes reachable; future providers slot in by registry registration only.

### 6. Empty States & Role Gating

**Client-level CTAs:**
- "No provider connected yet — Connect Clio / MyCase / Smokeball"
- "Webhook not registered — Set up subscription"

**Campaign-level CTAs:**
- "No provider selected — Choose a connected provider, or [Connect one in Client Setup →]"
- "No call variable group assigned — Pick or create one"
- "No dispositions configured — Add a disposition mapping"
- "No events yet — Run a test"

**Role gating** (uses existing `user_has_permission` and `is_org_member`):
- `system_admin`: all clients, all connections
- `partner_admin`: only clients within their partner tree
- `client_admin`: only their client's connections and campaigns
- Campaign-level forms **never render secret/token fields** regardless of role — those only exist in client-level wizards

### 7. Legacy Deprecation

- `CrmIntegrationWizard.tsx` → mark deprecated with banner: "This setup is moving to Client → Legal Connect. [Migrate now]"
- One-click migration button reads legacy `integration_configs.{clio|mycase}` and creates a `legal_connect_connections` row + moves credentials to `oauth_tokens`. Marks legacy config as `migrated_at: <timestamp>`.
- Legacy wizard route stays for one release behind a `?legacy=true` query param; nav links removed.

### 8. Files Changed

**New (~12):**
- 3 connect wizards, `ProviderConnectionCard`, `WebhookSettingsPanel`, `ProviderPoliciesPanel`, `FieldMappingPanel`, `ConnectionHealthPanel`, `ClientLegalConnectPage`, `CampaignOverlayPage`, 5 campaign-level panels

**Edited (~10):**
- `src/pages/admin/LegalConnectPage.tsx` — remove campaign-level tabs, keep system-admin global views only
- `src/App.tsx` — add new routes
- `src/components/AdminSidebar.tsx` — add "Legal Connect" under client menu, "Five9 Overlay" under each campaign
- `src/hooks/useFive9Overlay.ts` — accept `campaignId` filter
- `supabase/functions/_shared/five9-router.ts` — use `connection_id` resolution
- `supabase/functions/legal-connect-jobs/index.ts` — dispatch via `provider-registry`
- `supabase/functions/five9-overlay-test/index.ts` — replace `stubAdapter` with real adapter via registry; respect `dryRun` flag
- `supabase/functions/five9-main/index.ts` — use new resolution helper
- `src/components/admin/CrmIntegrationWizard.tsx` — deprecation banner + migrate button
- `src/data/buildMap.ts` — update outline status

**1 migration:** schema extensions above + trigger for `connection_id` consistency.

### 9. Out of scope (honest)

- Real OAuth handshakes still require `CLIO_CLIENT_ID`, `CLIO_CLIENT_SECRET`, `SMOKEBALL_CLIENT_ID`, `SMOKEBALL_CLIENT_SECRET`, `MYCASE_WEBHOOK_SECRET` — wizards build, Connect buttons disable until secrets present
- Cron registration for token refresh — surfaced as "Refresh now" admin button (cron schema not user-accessible)
- Bidirectional Five9 variable definition sync — Fabric59 stays source of truth

### 10. Acceptance

- Provider credentials only requested in client-level wizards
- Campaign setup form contains zero secret/token/auth fields
- Campaign provider-target dropdown only shows already-connected providers for that client
- Runtime reads provider creds exclusively from `legal_connect_connections` + `oauth_tokens`
- Legacy `CrmIntegrationWizard` shows deprecation banner with one-click migration
- All four golden-path Five9 flows resolve through `connection_id`, not legacy config

