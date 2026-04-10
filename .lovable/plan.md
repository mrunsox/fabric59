

# Five9 Gap-Closure Sprint Plan — E2E Testing Readiness

## Golden Path: Target E2E Test Scenario

```text
1. Five9 inbound call → ANI/DNIS/campaign sent to Fabric59 lookup endpoint
2. Fabric59 resolves contact from legal_connect_contacts / clio_mappings
3. Screen-pop data returned to Five9 Agent Desktop Plus
4. Agent handles call, sets disposition + worksheet answers
5. Five9 posts disposition + call variables to five9-main (post-disposition)
6. five9-main normalizes event → resolves tenant → dispatches to Clio handler
7. Clio handler: contact search/create → matter resolve → communication create
8. Event logged in api_logs + legal_connect_event_log
9. Reconciliation: Five9 call ID traceable through logs → CRM record IDs
```

---

## Gap → Story Mapping

| # | Gap | Sprint | Story |
|---|---|---|---|
| 1 | `five9-main` Clio token refresh uses env vars, not per-client secrets | S1 | Fix getClioAccessToken to read client_id/client_secret from legal_connect_connections |
| 2 | No duplicate prevention / idempotency on CRM writes | S1 | Add idempotency key check before CRM dispatch in five9-main |
| 3 | No test harness for Five9 payloads | S1 | Build Test Console for sending sample Five9 events to five9-main |
| 4 | No reconciliation view (call ID → events → CRM) | S2 | Build E2E trace view linking Five9 call to downstream actions |
| 5 | No structured error handling for missing call variables | S2 | Add validation + graceful rejection for required variables |
| 6 | MyCase standalone adapter not tested E2E | S3 | Verify MyCase adapter mirrors Clio golden path |

---

## Sprint 1 — Core E2E Plumbing (Critical Fixes)

**Goal:** Run one real Five9 → Fabric59 → Clio test call successfully with per-client credentials.

**Timebox:** 1 session

**Entry criteria:** All edge functions deployed, at least one tenant with Clio OAuth token configured.

### Stories

#### 1.1 Fix Clio Token Refresh to Use Per-Client Credentials
**File:** `supabase/functions/five9-main/index.ts` (lines 114-162)

The `getClioAccessToken` function currently reads `CLIO_CLIENT_ID` and `CLIO_CLIENT_SECRET` from `Deno.env.get()`. Since Clio credentials are per-client (stored in `legal_connect_connections.config`), this must be changed to:
- Accept `tenantId` as a parameter
- Query `tenants.integration_configs → clio.oauthTokenId`
- Join to `legal_connect_connections` via `oauth_token_id` to get `config.client_id` and `config.client_secret`
- Use those for the refresh grant

This is the same pattern already working in `legal-connect-jobs/index.ts` lines 100-133. Port that logic.

#### 1.2 Add Idempotency Guard to CRM Dispatch
**File:** `supabase/functions/five9-main/index.ts`

Before calling `handleCallForClio` / `handleCallForMyCase`:
- Compute idempotency key from `call.id + tenantId + disposition`
- Check `api_logs` or a new `processed_events` set for that key
- Skip if already processed, preventing duplicate CRM records on retry/replay

#### 1.3 Build Five9 Test Console Page
**Files:**
- New: `src/pages/admin/TestConsolePage.tsx` (may already exist — extend it)
- Wire into admin routes

The console should:
- Let admin select a tenant and provider
- Pre-fill a sample Five9 payload (lookup or post-disposition)
- Send it to `five9-main` via `supabase.functions.invoke`
- Display raw response + processing trace
- Show what CRM actions would fire (or did fire in test mode)

### Exit Criteria
- [ ] Clio token refresh works with per-client credentials (no env vars needed)
- [ ] Duplicate Five9 events don't create duplicate CRM records
- [ ] Admin can send a test payload and see the full processing result

---

## Sprint 2 — Hardening & Observability

**Goal:** E2E tests are repeatable, failures are visible, and results are verifiable.

**Timebox:** 1 session

**Entry criteria:** Sprint 1 complete.

### Stories

#### 2.1 Build E2E Reconciliation Trace View
**File:** New component on Reports or Legal Connect page

A view that:
- Takes a Five9 call ID or ANI + timestamp
- Queries `api_logs`, `legal_connect_event_log`, `legal_connect_sync_jobs`
- Shows the chain: webhook received → event logged → sync job created → CRM result
- Links to CRM record IDs (Clio contact/matter/communication IDs)

#### 2.2 Add Call Variable Validation
**File:** `supabase/functions/five9-main/index.ts`

Before CRM dispatch:
- Check tenant's `legal_connect_call_variable_mappings` for required variables
- If a required variable is missing from payload, log a structured error and return a clear rejection
- Don't silently proceed with partial data

#### 2.3 Add Error Scenario Test Cases
**File:** Extend Test Console

Add pre-built test scenarios:
- Missing required call variable → expect graceful rejection
- Unknown disposition → expect skip with log
- Expired Clio token → expect refresh + retry
- Duplicate call ID → expect idempotent skip

### Exit Criteria
- [ ] Given a Five9 call ID, admin can trace it through the full pipeline
- [ ] Missing required call variables produce clear, logged rejections
- [ ] At least 4 test scenarios (success, missing var, unknown dispo, duplicate) pass

### Acceptance Criteria (Sprint 1+2 combined)
- "Given a Five9 test call with disposition `Qualified Lead`, we see a contact + communication in Clio"
- "Given a missing required call variable, the system rejects gracefully and logs it"
- "Given a duplicate call event, no duplicate CRM records are created"
- "Given an expired Clio token, the system refreshes using per-client secrets and retries"

---

## Sprint 3 — MyCase Parity (Post-Clio Pilot)

**Goal:** MyCase flows mirror the Clio golden path for tenants using MyCase.

**Timebox:** 1 session

**Entry criteria:** Clio E2E testing passing.

### Stories
- Verify MyCase adapter mirrors the full golden path (lookup → post-disposition → case + note)
- Add MyCase-specific test scenarios to Test Console
- Validate idempotency and error handling for MyCase flows

**This sprint can be deferred until after Clio pilot** since MyCase uses simpler API key auth and the standalone adapter + job executor are already built.

---

## Risks & Assumptions

| Risk | Mitigation |
|---|---|
| Per-client Clio credentials may not be stored yet in `legal_connect_connections.config` | Sprint 1.1 includes fallback logging; setup wizard already captures these |
| Five9 payload format may vary between Web Connector and WFA triggers | normalizeCallEvent already handles multiple field names; test with real payloads |
| `legal_connect_contacts` table may be empty for test tenants | Lookup falls back to `clio_mappings` / `mycase_mappings`; pre-populate for test |
| Rate limits on Clio API during testing | Built-in retry with backoff already in clioApiFetch |

---

## Files Summary

| Sprint | Action | File |
|---|---|---|
| S1 | Fix per-client Clio token refresh | `supabase/functions/five9-main/index.ts` |
| S1 | Add idempotency guard | `supabase/functions/five9-main/index.ts` |
| S1 | Build/extend Test Console | `src/pages/admin/TestConsolePage.tsx` |
| S2 | Build reconciliation trace view | New component in Legal Connect or Reports |
| S2 | Add call variable validation | `supabase/functions/five9-main/index.ts` |
| S2 | Add error test scenarios | `src/pages/admin/TestConsolePage.tsx` |

