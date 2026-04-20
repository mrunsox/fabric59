

# Fabric59 Legal Connect + Five9 Master Build (6 Phases)

This consolidates the prior approved plans (Legal Connect phased build + Five9 Overlay) into one master build sequence. ~85% of the framework is already scaffolded; this plan finishes it in the strict order you specified.

## Current State (Confirmed)

- **27 `legal_connect_*` tables** — connections, sync jobs, event log, webhook subscriptions, conflicts, field mappings, provider settings, connection health, review queue, capability matrix, disposition mappings, intakes, audit log, renewal log
- **`legal-connect-jobs`** (716-line worker — idempotency, retry, dead-letter)
- **`legal-connect-webhooks`** (272-line ingester — HMAC verification for Clio/MyCase)
- **`legal-connect-test`**, **`legal-connect-admin`**, **`LegalConnectPage`** (11 tabs)
- **Clio:** `clio-oauth-callback` exists (token exchange only — no refresh, no deauth, no full adapter)
- **MyCase:** 190-line capability-aware adapter (missing `whoAmI`, tasks, activities, matter search)
- **Smokeball:** 14-line stub
- **Five9:** `five9-main` central webhook router, pre-call lookup endpoint, dispatch wired to legacy paths

## Build Sequence (Strict Order)

### Phase 1 — Shared Legal Provider Framework
Gap-fill the ~10% missing from the framework so all providers plug into one interface.

**New files:**
- `supabase/functions/_shared/legal-crm-adapter.ts` — abstract `LegalCrmAdapter` interface (`whoAmI`, `searchContact`, `createContact`, `updateContact`, `searchMatter`, `createMatter`, `createLead`, `createNote`, `createTask`, `createActivity`, `subscribeWebhooks`, `verifyWebhookSignature`, `normalizeEvent`, `refreshToken`, `deauthorize`)
- `supabase/functions/_shared/provider-registry.ts` — provider key → adapter module + capability lookup
- `supabase/functions/_shared/entity-matcher.ts` — deterministic match: entity_link → email → phone → name → review queue (never auto-pick on ambiguity)
- `supabase/functions/_shared/normalized-entities.ts` — canonical `Contact`, `Matter`, `Lead`, `Task`, `Note`, `Activity`, `ProviderEvent`, `SyncAction`, `ReviewItem` types

**Edited:**
- `supabase/functions/legal-connect-jobs/index.ts` — dispatch via registry, drop hardcoded `if (provider === ...)` branches

**Migrations (2):**
1. Seed `legal_connect_provider_capabilities` with honest capability matrix for Clio, MyCase, Smokeball (auth_connect, token_refresh, deauth_callback, contact_sync, matter_sync, lead_sync, task_sync, note_sync, activity_sync, webhook_receive, webhook_renewal, reverse_sync, test_simulation)
2. Add `region`, `base_url_override`, `auth_state_meta` columns to `legal_connect_connections`

**Exit:** any new provider added by implementing the interface — no orchestration changes needed.

---

### Phase 2 — Clio Adapter (Reference Implementation)
The deepest provider, used as the model for the others.

**New files:**
- `supabase/functions/clio/index.ts` — full adapter (contacts, matters, tasks, activities, communications, notes, whoAmI) implementing `LegalCrmAdapter`
- `supabase/functions/clio-token-refresh/index.ts` — cron-driven refresh of expiring tokens
- `supabase/functions/clio-deauth-callback/index.ts` — handles Clio's deauth notification, marks connection inactive, preserves audit
- `src/components/legal-connect/wizards/ClioConnectWizard.tsx` — 5-step wizard (intro → OAuth → capability detect → field mapping → test → activate)

**Edited:**
- `supabase/functions/legal-connect-webhooks/index.ts` — Clio branch registers subscriptions via `POST /api/v4/webhooks.json`, tracks expiry, renewal cron
- `supabase/config.toml` — register `clio`, `clio-token-refresh`, `clio-deauth-callback`

**Cron:** Clio token refresh every 30 min, webhook renewal every 6 hours.

**Exit:** clients can connect Clio, refresh stays alive, webhooks ingest, deauth flows cleanly.

---

### Phase 3 — MyCase Adapter (Capability-Aware)
Extend existing adapter; honest capability flags; never fake parity.

**Edited:**
- `supabase/functions/mycase/index.ts` — add `whoAmI`, `createTask`, `createActivity`, `searchMatters`; refactor to implement `LegalCrmAdapter`

**New files:**
- `src/components/legal-connect/wizards/MyCaseConnectWizard.tsx` — same wizard pattern, capability-gated
- `src/components/legal-connect/ProviderCapabilityBadge.tsx` — Supported / Conditional / Manual / Unsupported badge shown next to every action

**Behavior:** unsupported actions auto-route to `legal_connect_review_queue` with reason. If MyCase webhooks aren't enabled for the tenant, surface "polling mode" indicator + manual sync button.

**Exit:** MyCase works for everything its API supports; degrades gracefully for everything it doesn't.

---

### Phase 4 — Smokeball Adapter (Intake-First, Region-Aware)
Replace stub with full adapter; first lead-oriented provider.

**Replaced:** `supabase/functions/smokeball/index.ts` (stub → full adapter — leads, contacts, matters, notes, tasks, whoAmI, OAuth, region-aware base URL AU/US/UK)

**New files:**
- `supabase/functions/smokeball-oauth-callback/index.ts` — OAuth code exchange + region capture
- `src/components/legal-connect/wizards/SmokeballConnectWizard.tsx` — adds region picker step before OAuth
- `src/hooks/useSmokeballConnection.ts`

**Edited:**
- `supabase/functions/legal-connect-webhooks/index.ts` — add `/smokeball` route with HMAC verification
- `supabase/config.toml` — register `smokeball-oauth-callback`

**Exit:** Smokeball connects with correct regional base URL, leads create cleanly, webhooks normalize through shared pipeline.

---

### Phase 5 — Five9 Overlay (on top of provider framework)
Five9 becomes a first-class event source driving all three providers via the adapter interface.

**New shared modules:**
- `supabase/functions/_shared/five9-event-normalizer.ts` — raw payload → canonical `Five9NormalizedEvent` (interaction_started, lookup_requested, interaction_updated, disposition_submitted, callback_requested, post_call_sync, test, replay)
- `supabase/functions/_shared/five9-router.ts` — domain → partner → client → active provider connection (supports shared-domain multi-client routing via DNIS/queue/campaign overrides)
- `supabase/functions/_shared/disposition-mapping-engine.ts` — disposition + variables → action chain per provider capability
- `supabase/functions/_shared/writeback-orchestrator.ts` — builds action chain (lookup → upsert contact → resolve matter/lead → create note/task/activity), routes unsupported to review

**New edge function:**
- `supabase/functions/five9-overlay-test/index.ts` — dry-run pipeline: payload → normalized → resolved client → resolved provider → mapped actions → would-be sync jobs → result + review items

**Edited:**
- `supabase/functions/five9-main/index.ts` — wire normalizer → router → mapping engine → orchestrator; preserve existing behavior as fallback during transition
- Pre-call lookup endpoint — fan out via adapter interface (Clio: contact + open matters; MyCase: contact + cases; Smokeball: lead + matters); preserve sub-500ms via cached `legal_connect_entity_links`

**New UI (under `LegalConnectPage` "Five9 Overlay" tab):**
- `src/components/five9-overlay/DomainRoutingPanel.tsx` — domain ↔ client binding, campaign/DNIS/queue routing, default provider target
- `src/components/five9-overlay/CallVariablesPanel.tsx` — CRUD for variable groups + variables, validation rule builder, Fabric59 field path picker
- `src/components/five9-overlay/DispositionMappingPanel.tsx` — extends existing `DispositionMappingEditor` with required call variables, open/closed flag, reporting value, per-provider action chain preview, unsupported-action behavior
- `src/components/five9-overlay/PolicyControlsPanel.tsx` — auto-create toggles, strict duplicate protection, review queue fallback, attach-notes-only mode
- `src/components/five9-overlay/SimulationPanel.tsx` — payload editor with templates for the 4 golden-path flows + 9 core test scenarios, provider picker, expandable result tree
- `src/hooks/useFive9Overlay.ts`

**Migrations (4):**
1. `five9_call_variables` + `five9_call_variable_groups` (RLS scoped by client_id)
2. `five9_event_log` — raw_payload, normalized_payload, resolved_client_id, resolved_provider, mapped_actions JSONB, sync_jobs_created uuid[], correlation_id, status, error (RLS scoped by org_id)
3. `five9_campaign_routes` — five9_domain, campaign_name, dnis, queue_id → client_id, provider_target, default_disposition_policy
4. Extend `legal_connect_disposition_mappings` with `provider`, `required_call_variables`, `is_open_disposition`, `reporting_value`, `unsupported_action_behavior`

**Golden-path flows wired:**
- Flow A — New intake → Clio (no ANI match → variables → Qualified Lead → contact + matter + task)
- Flow B — Existing client inquiry → Clio (ANI match → matter lookup → communication/activity/task, no duplicate)
- Flow C — New intake → MyCase (capability-gated; unsupported → review queue)
- Flow D — New intake → Smokeball (lead + contact + matter intake per mapping)

**Exit:** Five9 events route to correct client + provider, map cleanly via configurable variables/dispositions, write back through shared adapters.

---

### Phase 6 — Shared Testing, Monitoring, Operational Hardening

**New UI:**
- `src/components/five9-overlay/Five9HealthPanel.tsx` — last event received, failed event count (24h), mapping failures, missing required variables, unresolved routing, writeback failures, review backlog
- `src/components/five9-overlay/EventLogViewer.tsx` — paginated `five9_event_log` viewer with raw/normalized toggle, outbound writeback log, sync job status, **Replay** action (re-enqueues with fresh correlation ID, audit-logged)
- `src/components/legal-connect/EventReplayDialog.tsx` — replay any event from `legal_connect_event_log` through sync pipeline (idempotent, audit-logged)
- `src/pages/admin/LegalConnectHealthPage.tsx` (or extend existing Reliability tab) — single pane: connection status, last sync, last failure, last webhook per provider, auth issues, queue depth, review backlog, capability mismatches, expiring webhooks

**Edited:**
- `supabase/functions/legal-connect-test/index.ts` — extend test plans to cover all 3 providers + Five9 overlay scenarios uniformly: auth, refresh, contact lookup, matter lookup, lead create (Smokeball), note write, webhook receive, duplicate handling, unsupported capability, retry behavior, review fallback, Five9 lookup, post-disposition, callback request, missing required variable, unresolved routing
- `legal_connect_audit_log` views — correlation ID tracing across event → job → provider response

**Conservative defaults enabled out of the box:** review queue fallback on, strict duplicate prevention on, webhook signature required, unsupported actions go to review (never silently dropped).

**Role enforcement (existing helpers):**
- System admin: full access
- Partner admin: domain routing + per-client config for partner's clients
- Client admin: variables, dispositions, policies for own client; read-only logs

**Exit:** all 3 providers + Five9 testable through one operational layer; admins see health/failures clearly; retry + replay + review behavior all work.

---

## Required Secrets (Added to `/outline` "Required Secrets — To Be Configured Later")

The framework builds and deploys without these. Connect buttons disable with "Add credentials first" until secrets are configured.

- `CLIO_CLIENT_ID`, `CLIO_CLIENT_SECRET`
- `MYCASE_WEBHOOK_SECRET` (per-tenant API tokens stored in `oauth_tokens`)
- `SMOKEBALL_CLIENT_ID`, `SMOKEBALL_CLIENT_SECRET`, `SMOKEBALL_WEBHOOK_SECRET`

Existing `FIVE9_USERNAME` + `FIVE9_PASSWORD` already configured. No new Five9 secrets needed.

---

## Architecture (End State)

```text
Five9 webhook ──▶ five9-main
                     │
                     ▼
            five9-event-normalizer ──▶ five9_event_log (raw + normalized)
                     │
                     ▼
                five9-router ──▶ resolves client + provider connection
                     │
                     ▼
            disposition-mapping-engine ──▶ action chain (per capability)
                     │
                     ▼
            legal_connect_sync_jobs (queue, idempotent, retry-safe)
                     │
                     ▼
            writeback-orchestrator ──▶ LegalCrmAdapter
                     │                          │
                     │           ┌──────────────┼──────────────┐
                     │           ▼              ▼              ▼
                     │         clio          mycase        smokeball
                     │           │              │              │
                     │           ▼              ▼              ▼
                     │      Clio API       MyCase API    Smokeball API
                     │
                     ▼
            audit log + entity_link ↔ correlation ID
                     │
                     ▼
            review queue (unsupported / ambiguous / failed)
```

---

## Files Summary (Master Total)

**New (~24):** 4 shared modules (Phase 1), 3 Clio (Phase 2), 1 wizard + 1 badge (Phase 3), 1 OAuth callback + 1 wizard + 1 hook (Phase 4), 4 shared modules + 1 test function + 5 Five9 panels + 1 hook (Phase 5), 4 monitoring components (Phase 6)

**Replaced (1):** `supabase/functions/smokeball/index.ts`

**Edited (~10):** `mycase/index.ts`, `clio-oauth-callback/index.ts`, `legal-connect-jobs/index.ts`, `legal-connect-webhooks/index.ts`, `legal-connect-test/index.ts`, `five9-main/index.ts`, `LegalConnectPage.tsx`, `DispositionMappingEditor.tsx`, `src/types/integrations.ts`, `supabase/config.toml`, `src/data/buildMap.ts`

**Migrations (6):** capability matrix seed, connection columns (region/base_url/auth_state_meta), Five9 call variables + groups, Five9 event log, Five9 campaign routes, disposition mapping extensions

**Edge functions registered:** `clio`, `clio-token-refresh`, `clio-deauth-callback`, `smokeball-oauth-callback`, `five9-overlay-test`

**Cron jobs:** Clio token refresh (30 min), Clio webhook renewal (6 hr)

---

## Out of Scope (Honest Disclosure)

- Real OAuth handshakes won't complete until the 5 secrets above are added
- Webhook subscriptions require URL+secret registration in each provider's dev portal — wizards generate and display them for paste-in
- Smokeball region defaults to US; AU/UK supported but require explicit selection
- Document/attachment sync excluded (reserved for future phase)
- Five9 call variable **import from Five9** included as a one-shot button; bidirectional variable definition sync is not — Fabric59 stays source of truth for mappings
- Reporting integration with Five9 native reports not included; reporting values stored in `five9_event_log` for downstream BI

---

## Build Order (Strict, No Skipping)

1. Phase 1 — Shared framework (interface, registry, matcher, capability seed)
2. Phase 2 — Clio (reference implementation)
3. Phase 3 — MyCase (capability-aware extension)
4. Phase 4 — Smokeball (intake-first, region-aware)
5. Phase 5 — Five9 Overlay (event normalizer, router, mapping engine, orchestrator, admin UI, simulation)
6. Phase 6 — Testing, monitoring, replay, hardening

