

# Close Five9 Integration Gaps — Implementation Plan

Now that we've confirmed Clio credentials are per-client (already handled by `integration_configs` JSONB + `oauth_tokens`), here are the remaining actionable items from the audit.

---

## 1. Wire Real CRM Calls into `legal-connect-jobs` processQueue

**Problem:** Lines 111-125 of `legal-connect-jobs/index.ts` mark every job as "succeeded" without executing any CRM API calls. The entire Legal Connect sync pipeline is instrumented but has no execution engine.

**Fix:** Replace the stub with a dispatcher that:
- Reads the job's `provider` and `job_type` fields
- Fetches the tenant's `integration_configs` to get Clio OAuth token ID or MyCase API key
- For Clio jobs: obtains access token via `oauth_tokens`, calls Clio API (contact search/create, matter resolve, communication create) — replicating the logic already proven in `five9-main`
- For MyCase jobs: fetches API key from `api_keys` table, calls MyCase API with the same patterns from `five9-main`
- Records output payload on success, or triggers retry/dead-letter on failure

**File:** `supabase/functions/legal-connect-jobs/index.ts` — replace lines 111-125 with ~200 lines of real CRM dispatch logic, extracting the Clio/MyCase API helpers (already written in `five9-main`) into shared inline functions.

---

## 2. Build Pre-Call Lookup Endpoint

**Problem:** Five9 Agent Desktop Plus screen-pop requires a lookup URL that returns contact data before/during a call. Currently `five9-main` only handles `call_ended`/`disposition_set` — no pre-call path.

**Fix:** Add a `lookup` action to `five9-main` that:
- Accepts ANI (caller phone number) + optional DNIS/campaign
- Searches `legal_connect_contacts` canonical table first
- Falls back to `clio_mappings` / `mycase_mappings`
- Returns structured screen-pop data: contact name, phone, matter/case info, recent call history
- Responds in <500ms (no CRM API calls, local DB only)

**File:** `supabase/functions/five9-main/index.ts` — add ~80 lines for a new `lookup` path before the existing Route A/B processing.

---

## 3. Add Call Variable SOAP Actions to Five9 Provisioning

**Problem:** No `createCallVariable`, `modifyCallVariable`, or `getCallVariables` SOAP actions exist, preventing programmatic management of Five9 call variables.

**Fix:** Add 3 new action handlers to `five9-provisioning/index.ts`:
- `getCallVariables` — SOAP `getCallVariables` → parse response
- `createCallVariable` — accepts name, group, description, type (STRING/NUMBER/DATE/BOOLEAN/CURRENCY/PERCENT/EMAIL/URL/PHONE/TIME/TIME_PERIOD/LIST)
- `modifyCallVariable` — accepts name + updates

**File:** `supabase/functions/five9-provisioning/index.ts` — add ~80 lines after the existing disposition management section.

---

## 4. Build Real MyCase Standalone Adapter

**Problem:** `mycase/index.ts` is a 14-line stub returning "API integration pending."

**Fix:** Replace with a real adapter supporting:
- `searchContacts` — by phone/email/name
- `createContact` — with phone, name, email
- `searchCases` — by contact_id, status
- `createCase` — with name, contact_id
- `createNote` — with subject, content, case_id or contact_id
- `getContact` / `getCase` — by ID

Uses the same `mycaseApiFetch` pattern already proven in `five9-main`. Reads API key from `api_keys` table via tenant config.

**File:** `supabase/functions/mycase/index.ts` — full rewrite, ~250 lines.

---

## 5. Seed Example Library Data

**Problem:** The `legal_connect_example_library` table exists but has no rows. The Testing Panel's example picker shows empty state.

**Fix:** Create a migration that inserts ~15 example scenarios covering:
- Clio: contact_created, contact_updated, matter_created, matter_updated, task_created
- MyCase: contact_created, case_created, note_created
- Five9: qualified_lead, callback_scheduled, consult_booked, no_answer, wrong_number, voicemail

Each row includes provider, scenario_name, description, sample_payload, expected_outcome.

**Method:** Database migration with INSERT statements.

---

## 6. Wire Agent Context Panel to Live Data

**Problem:** `AgentContextPanel` accepts props but is never rendered with real data from Legal Connect hooks.

**Fix:** Create a wrapper component `AgentContextPanelConnected` that:
- Takes `clientId` and `callerPhone` as props
- Uses `useLegalContacts` to find the contact by phone
- Uses `useLegalMatters` to find open matters for that contact
- Uses `useLegalEventLog` for recent events
- Passes resolved data into `AgentContextPanel`

**Files:**
- New: `src/components/legal-connect/AgentContextPanelConnected.tsx` (~50 lines)
- Modified: Wire it into the Agent Dashboard page where appropriate

---

## Execution Order

1. `legal-connect-jobs` — real CRM dispatch (highest impact, unlocks pipeline)
2. `five9-main` — pre-call lookup endpoint
3. `five9-provisioning` — call variable SOAP actions
4. `mycase/index.ts` — full adapter rewrite
5. DB migration — seed example library
6. `AgentContextPanelConnected` — live data wiring

## Files Summary

| Action | File |
|--------|------|
| Major rewrite | `supabase/functions/legal-connect-jobs/index.ts` |
| Add lookup path | `supabase/functions/five9-main/index.ts` |
| Add 3 actions | `supabase/functions/five9-provisioning/index.ts` |
| Full rewrite | `supabase/functions/mycase/index.ts` |
| New component | `src/components/legal-connect/AgentContextPanelConnected.tsx` |
| DB migration | Seed `legal_connect_example_library` with ~15 rows |

