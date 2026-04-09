
# Implementation Plan: Multi-Tenant + Testing + Reporting/Reconciliation

These three prompts represent a very large body of work. Given that Phase 1A (database) and Phase 1B (UI shell + hooks) are complete, the most productive approach is to implement these as three focused sessions, each building on the prior.

---

## Current State

- **20 Legal Connect tables** exist with full RLS (org-scoped via `get_user_org_ids`, `is_org_owner_or_admin`, `is_master_admin`)
- **`client_id`** column exists on all Legal Connect tables — multi-tenant scoping at the client level is already in the schema
- **`tenants` table** has `partner_id` for partner→client hierarchy
- **UI shell** has 10 tabs with real data hooks, but most tabs show placeholder/empty states
- **No edge functions** exist yet for Legal Connect (Five9 lookup, Clio OAuth, etc.)

---

## Session 1: Multi-Tenant White-Label Hardening

### Database Changes (Migration)
- Add `legal_connect_tenant_configs` table for per-client Legal Connect settings (sandbox_mode, feature_flags, ai_preferences, billing_config)
- Add `is_sandbox` boolean to `legal_connect_connections` (default false)
- Add `client_id` filter index optimizations where missing

### Hook Updates (`useLegalConnect.ts`)
- Add `clientId` parameter to all list hooks so data can be filtered by selected client
- Add `useLegalConnectClients()` hook that joins `tenants` with `legal_connect_connections` to show connection status per client
- Add `useClientLegalConnectSummary(clientId)` for single-client overview

### UI Changes
- **Client selector** at top of LegalConnectPage — dropdown of tenants scoped to org, filters all tabs by selected client
- **Connections tab**: show connections grouped by client, with client ownership badges
- **Campaigns tab**: filter by client, show client→campaign→provider routing chain
- **Policies tab**: client-scoped profile assignment
- **Client Onboarding Wizard**: new dialog component (`LegalConnectClientSetup.tsx`) with steps: Select Provider → Configure Campaign Types → Set Policy Defaults → Generate Checklist
- Add client-level capability override UI in Connections tab

### Edge Function
- `supabase/functions/legal-connect-admin/index.ts` — handles client config CRUD, connection ownership validation, capability override management (keeps sensitive ops server-side)

### Security
- Validate that `client_id` on every Legal Connect write matches a tenant the user's org owns
- Encrypted token fields (`encrypted_access_token`, `encrypted_refresh_token`) never returned in frontend queries — add a DB view or edge function that strips them

---

## Session 2: Tenant Testing Framework

### Database Changes (Migration)
- Add `legal_connect_test_runs` table: id, client_id, org_id, test_type, test_config (jsonb), expected_output (jsonb), actual_output (jsonb), status (pass/fail/error), correlation_id, created_at
- Add `legal_connect_test_plans` table: id, client_id, org_id, plan_name, test_cases (jsonb), generated_by (ai/manual), status, created_at

### Edge Function
- `supabase/functions/legal-connect-test/index.ts` — handles:
  - `simulateLookup`: fake Five9 inbound with configurable ANI/DNIS/campaign, runs through real lookup logic, returns matched contact/matter/state without writing to CRM
  - `simulateDisposition`: fake post-disposition with configurable disposition code, runs policy engine, creates dry-run sync jobs (flagged as test), returns what would happen
  - `simulateWebhook`: fake Clio/MyCase webhook payload, runs normalization pipeline, returns event log preview
  - `runTestPlan`: execute a stored test plan, record results

### UI Changes
- **Testing tab** (replace placeholder): 
  - Test type selector (Lookup, Disposition, Webhook, Full Flow)
  - Per-type input forms with campaign presets (inbound_intake, consult_booking, etc.)
  - Expected vs Actual comparison panel
  - Test history table from `legal_connect_test_runs`
  - Pass/fail badges, correlation ID links to Logs tab
  - "Generate Test Plan" button that calls AI assistant
  - Export test report (CSV/PDF)

### AI Integration
- Add `test_plan` session type to `legal-connect-ai` edge function (to be created)
- Input: client provider, campaign types, policy profile, capabilities
- Output: structured test cases with expected outcomes

---

## Session 3: Five9 Reporting & Reconciliation

### Database Changes (Migration)
- Add `legal_connect_call_records` table: id, client_id, org_id, call_id, interaction_id, ani, dnis, campaign_name, agent_id, agent_name, start_time, end_time, duration_seconds, disposition_code, disposition_label, call_variables (jsonb), raw_payload (jsonb), cleaned (boolean), excluded (boolean), exclusion_reason, billing_eligible (boolean), billing_category, created_at
- Add `legal_connect_billing_metrics` materialized view or table: client_id, campaign_name, period_start, period_end, total_calls, handled_calls, meaningful_calls, consult_booked, callbacks_requested, crm_writes_attempted, crm_writes_succeeded, crm_writes_failed, review_queue_count, avg_handling_time, sync_success_rate, excluded_count
- Add `legal_connect_reconciliation_mismatches` table: id, client_id, mismatch_type, call_id, details (jsonb), resolved, created_at
- Add `legal_connect_disposition_categories` table: id, org_id, client_id, disposition_code, category (meaningful_handled, callback, consult_booked, no_action, spam, excluded, exception), billable (boolean)
- Add `legal_connect_required_variables` table: id, org_id, client_id, campaign_type, variable_name, variable_label, variable_type, required (boolean), sensitive (boolean), blocked (boolean), reportable_only (boolean)

### Edge Function
- `supabase/functions/legal-connect-reporting/index.ts` — handles:
  - `ingestCallRecord`: normalize and store Five9 payload with cleanup rules (phone normalization, timezone, dedup, spam exclusion)
  - `reconcile`: compare call records vs event log vs sync jobs, flag mismatches
  - `getBillingMetrics`: compute metrics per client/campaign/period
  - `getReconciliationReport`: return mismatch summary

### Hooks
- `useLegalCallRecords(clientId, filters)` — paginated call record list
- `useLegalBillingMetrics(clientId, period)` — billing summary
- `useLegalReconciliation(clientId)` — mismatch list
- `useLegalDispositionCategories(clientId)` — disposition classification config

### UI Changes
- Add **Reporting** tab to LegalConnectPage (11th tab, or sub-tabs within existing structure):
  - **Metrics Summary**: stat cards for total/handled/meaningful/consult/callback/sync success
  - **Call Records**: searchable/filterable table with raw vs cleaned toggle
  - **Disposition Categories**: configuration table for classifying dispositions
  - **Required Variables**: per-campaign-type variable schema editor
  - **Billing**: per-client/campaign billing metrics with date range filter, exportable
  - **Reconciliation**: mismatch table with filters (handled-no-event, event-no-job, failed-billable, duplicate-writes)
  - Export CSV for all views

### AI Integration
- Reporting AI assistant that can explain exclusions, summarize anomalies, recommend missing variables

---

## Execution Order

1. **Session 1** — Multi-tenant hardening (DB migration + client selector + onboarding wizard + security)
2. **Session 2** — Testing framework (DB migration + test edge function + Testing tab UI)
3. **Session 3** — Reporting/reconciliation (DB migration + reporting edge function + Reporting tab UI)

Each session is self-contained and delivers a working slice. Estimated scope: ~300-400 lines SQL per migration, ~200-300 lines per edge function, ~400-600 lines UI per session.

---

## Technical Notes

- All new tables follow existing pattern: `organization_id` + `client_id`, RLS via `get_user_org_ids`/`is_org_owner_or_admin`/`is_master_admin`
- Edge functions use service role key for DB writes, validate JWT in code
- Client selector state stored in React context or URL param for tab persistence
- Test simulations use dry-run flags to avoid writing to production CRM connections
- Reconciliation runs as on-demand or scheduled edge function invocation
