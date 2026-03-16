

# Phase 2: Consolidate CRM Push + Browser Testing

## What needs to happen

### 1. Update `crm-push` to read from `integration_configs` JSONB
Currently `crm-push` queries `tenants` for flat columns `crm_type, crm_api_url, crm_api_key`. After Phase 6, these values live in `integration_configs.crm`. Update the edge function to:
- Select `crm_type, integration_configs` from `tenants`
- Read `api_url` and `api_key` from `integration_configs.crm` with fallback to flat columns
- Remove the duplicate `clioAdapter` from `crm-push` (Clio is handled by `five9-main` directly)

### 2. Wire `five9-main` to call `crm-push` for non-legal CRMs
`five9-main` already has `dispatchToGenericCrm()` (line 623) but never calls it. Add dispatch logic:

**Route A** (line 729-770): After Clio/MyCase handling, check if tenant has a generic CRM configured (`crm_type` not in `clio/mycase`). If so, call `dispatchToGenericCrm()` with normalized call data.

**Route B** (line 668-726): Same pattern — for each tenant under the domain, after Clio/MyCase, check for generic CRM and dispatch.

### 3. Update `IntegrationConfigs` type in `five9-main`
Add optional `crm?: { type: string; api_url: string; api_key: string }` to the `IntegrationConfigs` interface inside `five9-main` so it can read the generic CRM config from JSONB.

### 4. Browser testing
Navigate to `/admin/tree-editor/new` to verify canvas renders. Navigate to `/admin/agent-dashboard` and `/admin/supervisor` to verify tabs render without errors.

## Files changed
- `supabase/functions/crm-push/index.ts` — Read from `integration_configs.crm`, remove duplicate Clio adapter
- `supabase/functions/five9-main/index.ts` — Add generic CRM dispatch calls in Route A and Route B, extend `IntegrationConfigs` type

## Risk
Low — `dispatchToGenericCrm` is fire-and-forget, additive change only.

