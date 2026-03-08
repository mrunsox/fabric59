

# Five9 ⇄ Clio & Five9 ⇄ MyCase Integration Engine

## What Already Exists

- **`tenants.integration_configs`** JSONB column — ready for the `Five9ToCrmRules` config shape
- **`crm-push` edge function** with a basic `clioAdapter` (contacts/activities endpoints)
- **`five9-webhook`** for inbound Five9 events with domain/secret validation
- **`mycase` edge function** — stub only, returns placeholder responses
- **`web-callback` edge function** — validates, normalizes, triggers Five9 dial
- **Multi-tenant RLS**, `x-tenant-id` / `x-webhook-secret` header patterns, `api_logs` table
- **Encrypted credentials** via pgcrypto pattern on `five9_domains`

## Implementation Plan

### 1. Database Migrations

**New tables:**

| Table | Purpose |
|---|---|
| `oauth_tokens` | Store Clio OAuth2 access/refresh tokens (encrypted), per tenant+provider |
| `clio_mappings` | phone → Clio contact_id + matter_id, per tenant |
| `mycase_mappings` | phone → MyCase contact_id + case_id, per tenant |

All three get standard org-scoped RLS (master_admin ALL, org owner/admin ALL, org members SELECT, platform admin ALL).

`oauth_tokens` columns: `id`, `tenant_id`, `organization_id`, `provider` (text, e.g. "clio"), `access_token_encrypted`, `refresh_token_encrypted`, `expires_at`, `scopes`, `created_at`, `updated_at`.

`clio_mappings` columns: `id`, `tenant_id`, `organization_id`, `phone`, `contact_id`, `matter_id`, `created_at`, `updated_at`. Unique on `(tenant_id, phone)`.

`mycase_mappings` columns: same shape but `case_id` instead of `matter_id`.

### 2. Edge Function: `five9-main`

Single entrypoint for all tenants' Five9 call events. Replaces per-CRM webhook routing.

**Flow:**
1. Validate `x-tenant-id` + `x-webhook-secret` headers
2. Fetch tenant row + `integration_configs`
3. Normalize Five9 payload → `CallEvent` (direction, phone, agent, queue, campaign, disposition, recording, timestamps)
4. If `integration_configs.clio?.enabled` → call `handleCallForClio()`
5. If `integration_configs.mycase?.enabled` → call `handleCallForMyCase()`
6. Log results to `api_logs`
7. Return summary response

All handler logic lives **inline in the same file** (Deno edge functions don't support multi-file imports from shared libs). The handlers will be clearly separated as named async functions within `index.ts`.

### 3. Clio Handler (inside `five9-main`)

`handleCallForClio(tenantId, call, config)`:

- Merge `config.rules` with `perQueueOverrides[call.queue]`
- Resolve phone → `clio_mappings` lookup
- If no mapping: search Clio contacts by phone via API v4
- If not found + `autoCreateContact`: create contact via Clio API
- Resolve matter: list open matters for contact, pick latest if `attachToLatestOpenOnly`
- If no matter + `autoCreateMatterOrCase` + queue allowed: create matter
- Create Communication (always) — phone call type with all metadata
- If `createTimeEntryForBillable` + matter exists: create Activity/TimeEntry
- Update `clio_mappings` with new IDs
- Uses `getClioAccessToken()` helper that reads `oauth_tokens` and refreshes if expired

### 4. MyCase Handler (inside `five9-main`)

`handleCallForMyCase(tenantId, call, config)`:

- Same rule-merge pattern
- Resolve phone → `mycase_mappings`
- Search/create contact via MyCase API
- Resolve case: list cases for contact, pick latest or create
- Create Note linked to case (preferred) or contact (fallback)
- Update `mycase_mappings`
- Uses API key from tenant's `integration_configs.mycase.apiKeyId` → `api_keys` table

### 5. Clio OAuth2 Infrastructure

**Edge function: `clio-oauth-callback`**
- Receives redirect from Clio with `code` + `state` (state contains tenant_id)
- Exchanges code for tokens via Clio token endpoint
- Encrypts and stores in `oauth_tokens`
- Updates `integration_configs.clio.oauthTokenId`
- Redirects back to Fabric59 admin UI

**Token refresh helper** (inline in `five9-main`):
- Reads `oauth_tokens` row
- If expired, uses refresh_token to get new access_token
- Updates row
- Returns valid access_token

### 6. MyCase API Key Infrastructure

Uses the existing `api_keys` table pattern. The tenant's `integration_configs.mycase.apiKeyId` references an `api_keys` row. A helper function decrypts and returns the key for HTTP requests.

### 7. Admin UI: Integration Rules Panel

Extend the existing `TenantForm.tsx` with a new collapsible section **"CRM Integration Rules"** that appears when `crm_type` is `clio` or when MyCase is toggled on:

- Toggle: Enable Clio / Enable MyCase
- Checkboxes for each `Five9ToCrmRules` field
- Multi-select for `autoCreateOnlyForQueues`
- Saves to `integration_configs` JSONB

### 8. Build Outline Update

Add "CRM Integration Engine" category to `buildMap.ts` with ~8 items covering the tables, handlers, OAuth infra, and admin UI wiring.

### 9. Config.toml

Add entries:
```toml
[functions.five9-main]
verify_jwt = false

[functions.clio-oauth-callback]
verify_jwt = false
```

## File Changes Summary

| File | Change |
|---|---|
| Migration SQL | Create `oauth_tokens`, `clio_mappings`, `mycase_mappings` tables with RLS |
| `supabase/functions/five9-main/index.ts` | New — main engine with inline Clio + MyCase handlers |
| `supabase/functions/clio-oauth-callback/index.ts` | New — OAuth2 callback handler |
| `src/components/tenants/TenantForm.tsx` | Add CRM Integration Rules collapsible section |
| `src/data/buildMap.ts` | Add "CRM Integration Engine" category |
| `supabase/config.toml` | Add five9-main + clio-oauth-callback entries |

## What This Does NOT Include

- Clio ⇄ MyCase sync (explicitly out of scope per spec)
- Five9 → CRM reverse push (screen-pops, record injection) — stubbed for future
- Background retry queue — uses inline retry (2-3 attempts) within edge function
- MyCase OAuth2 — v1 uses API key; OAuth2 reuses `oauth_tokens` pattern later
- Per-queue override UI — the JSONB supports it but admin UI will use simple toggles first

