

# Legal Connect Module — Phased Implementation Plan

## Overview

This is a large enterprise module (~22 new database tables, ~10 edge functions, ~15 new UI pages/tabs) that adds deep two-way integration between Five9, Clio, and MyCase through Fabric59 as the orchestration hub. The existing codebase already has foundational pieces: `oauth_tokens`, `clio_mappings`, `mycase_mappings`, `five9_domains`, tenant/partner/org hierarchy, and CRM adapter patterns. Legal Connect will build on top of these.

Given the scale, this must be built across **multiple implementation sessions**, each delivering a functional slice.

---

## Phase 1A: Database Foundation (Session 1)

Create all 22 Legal Connect tables in a single migration. This is the foundation everything else depends on.

**Tables created:**
- `legal_connect_connections` — one row per client per provider (auth, tokens, status)
- `legal_connect_provider_capabilities` — global provider feature matrix
- `legal_connect_client_capabilities` — per-client overrides
- `legal_connect_campaigns` — Five9 campaign-to-provider mappings
- `legal_connect_disposition_mappings` — disposition → CRM action rules
- `legal_connect_call_variable_mappings` — Five9 variable → canonical field mappings
- `legal_connect_field_policies` — per-field pass-through rules
- `legal_connect_policy_profiles` — named policy presets per client
- `legal_connect_contacts` — canonical contact mirror
- `legal_connect_matters` — canonical matter/case mirror
- `legal_connect_tasks` — canonical task mirror
- `legal_connect_notes` — canonical note mirror
- `legal_connect_entity_links` — cross-system ID xref
- `legal_connect_webhook_subscriptions` — webhook lifecycle tracking
- `legal_connect_event_log` — immutable audit/event table
- `legal_connect_sync_jobs` — queue-based async job processing
- `legal_connect_conflicts` — conflict/duplicate tracking
- `legal_connect_review_queue` — manual review items
- `legal_connect_ai_sessions` — AI assistant session storage
- `legal_connect_ai_checklists` — generated checklists

All tables get:
- `organization_id` for RLS scoping (via `client_id → tenants → organization_id` or direct)
- RLS enabled with org-membership policies using existing `is_org_member` / `is_master_admin` helpers
- Proper indexes on lookup columns
- `created_at` / `updated_at` defaults

Seed `legal_connect_provider_capabilities` with Clio and MyCase capability rows.

**Migration size:** ~500 lines SQL. Single migration file.

---

## Phase 1B: UI Shell + Navigation (Session 2)

**New files:**
- `src/pages/admin/LegalConnectPage.tsx` — main Legal Connect module with 10 tabs (Overview, Connections, Campaigns, Policies, Mappings, Sync Activity, Review Queue, AI Setup, Testing, Logs)
- Add route `/admin/legal-connect` to `App.tsx`
- Add "Legal Connect" nav item to `AdminLayout.tsx` under Operations group

**Initial tab content:**
- **Overview** — stat cards (connected providers, webhook health, pending reviews, sync success rate) pulling from the new tables
- **Connections** — list/manage provider connections per client with status badges
- Other tabs show "Coming soon" placeholders

**New hooks:**
- `src/hooks/useLegalConnect.ts` — CRUD hooks for connections, capabilities, campaigns, etc.

---

## Phase 1C: Clio OAuth + Connection Flow (Session 3)

**Edge functions:**
- `supabase/functions/legal-connect-clio/index.ts` — handles OAuth initiate, token refresh, disconnect, deauth callback, webhook subscribe/renew
- Update `supabase/functions/clio-oauth-callback/index.ts` to write to `legal_connect_connections`

**UI updates:**
- Connections tab: Clio card with Connect (OAuth), Refresh Token, Test, Disconnect buttons
- Token health indicator, webhook subscription status
- Scopes display

---

## Phase 1D: Five9 Lookup + Post-Disposition Endpoints (Session 4)

**Edge functions:**
- `supabase/functions/legal-connect-five9/index.ts` — handles:
  - `POST /lookup` — receive ANI/DNIS/campaign, find client, lookup contact+matter in canonical tables or via Clio API, return context
  - `POST /post-disposition` — receive disposition payload, apply policy, create sync jobs
  - `POST /callback` — create callback request
  - `POST /test-event` — simulate events for testing

**UI updates:**
- Campaigns tab: CRUD for Five9 campaign mappings with campaign type presets
- Generate Five9 setup instructions per campaign type (connector URLs, required variables, disposition list)

---

## Phase 1E: Policy Engine + Mapping Engine (Session 5)

**UI updates:**
- **Policies tab**: Full pass-through matrix UI
  - Policy profile selector/creator
  - Matrix grid: rows = entity types, columns = directions, cells = allow/block/review/redact/hash
  - Auto-create controls, duplicate prevention, unknown caller behavior
- **Mappings tab** with sub-tabs:
  - Disposition mappings editor (disposition → action profile with all toggles)
  - Call variable mappings editor (source → canonical → provider path with transform/sensitivity)
  - Field policies editor
  - Status mappings

---

## Phase 2A: Sync Engine + Event Log (Session 6)

**Edge function updates:**
- Sync job processor in `legal-connect-clio/index.ts`: dequeue jobs, apply policy, call Clio API, update status
- All writes go through `legal_connect_sync_jobs` with idempotency keys
- Event log written for every inbound/outbound event

**UI updates:**
- **Sync Activity tab**: live event stream, job queue, dead letter, retry controls
- **Logs tab**: immutable event log viewer with filters (client, provider, call ID, status, date)

---

## Phase 2B: Review Queue + Conflict Resolution (Session 7)

**UI updates:**
- **Review Queue tab**: cards/table for ambiguous matches, blocked fields, duplicate candidates, unsupported actions
- Actions: approve, reject, merge, remap, retry, suppress
- Conflict detail view with side-by-side comparison

---

## Phase 2C: Clio Webhooks + Reverse Sync (Session 8)

**Edge functions:**
- `supabase/functions/legal-connect-webhooks/index.ts` — receive Clio webhooks, verify signature, normalize, create event log + sync jobs
- Webhook renewal cron job (renew before 3-day expiry)

**UI updates:**
- Connections tab: webhook subscription list, renewal status, manual renew button
- Sync Activity: show reverse sync events (CRM → Fabric59)

---

## Phase 3: MyCase Adapter (Session 9)

**Edge functions:**
- `supabase/functions/legal-connect-mycase/index.ts` — API key auth, contact/case lookup, note/task writeback, capability-aware routing

**UI updates:**
- Connections tab: MyCase card with capability detection/override
- Capability matrix UI per client
- Read-only fallback for unsupported actions

---

## Phase 4: AI Setup Assistants (Session 10)

**Edge function:**
- `supabase/functions/legal-connect-ai/index.ts` — 7 structured AI assistants (Guided Setup, Campaign Setup Generator, CRM Setup Generator, Pass-through Explainer, Mapping Recommender, Test Plan Generator, Go-Live Readiness)

**UI updates:**
- **AI Setup tab**: tool selector with structured inputs/outputs per assistant
- Checklist storage and editing
- Readiness score computation and display

---

## Phase 5: Testing Console (Session 11)

**UI updates:**
- **Testing tab**: simulate inbound call, known/unknown caller, disposition, callback, Clio webhook, MyCase webhook
- Expected vs actual output comparison
- Test result storage

---

## Technical Notes

- All new tables use `client_id` referencing `tenants.id` (which already has `organization_id` for RLS)
- RLS policies use existing `is_org_member(auth.uid(), org_id)` and `is_master_admin(auth.uid())` helpers
- Edge functions use service role key for DB writes, validate JWT in code
- Provider adapters implement a shared TypeScript interface (`LegalProviderAdapter`)
- The canonical entity model (contacts, matters, tasks, notes) acts as a local mirror — not a replacement for provider data
- Sync jobs use exponential backoff with dead-letter after 10 attempts

---

## Recommended Starting Point

**Session 1 (Phase 1A)** creates all database tables. This is the critical foundation — everything else builds on it. Approve this plan and I'll start with the migration.

