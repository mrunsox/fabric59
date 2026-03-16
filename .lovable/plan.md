

# Consolidation Refactor — Status

## Completed

### Phase 3: Type Consolidation ✅
- Refactored `database.ts` to add missing fields (`webhook_secret`, `billing_rate_per_minute`, `five9_campaign_identifier`)
- Added doc header explaining it's a convenience layer over auto-gen types
- Fixed `useDomains.ts` and `useTenants.ts` to map all fields
- Installed `@tiptap/starter-kit` for RichTextEditor

### Phase 4: Fix Disposition Stub ✅
- Rewired `useDispositions.ts` to query real `disposition_access` table
- Maps rows to `Disposition` interface tree editor expects
- Wired `useCreateDisposition` and `useDeleteDisposition` to real CRUD

### Phase 5: Session Hook Docs ✅
- Added clarifying doc headers to `useCallSessions` (telephony) and `useScriptSessions` (script execution)
- Documented the linkage: `call_sessions.script_session_id → script_sessions.id`

### Phase 7: Wire resolveEffectiveConfig ✅
- Added `resolveEffectiveConfig` as a named export alias in `config-merge.ts`
- Canonical function for org → partner → tenant config inheritance

### Phase 1: Merge Five9 Webhooks ✅
- Merged `five9-webhook` logic into `five9-main` as Route B (x-five9-domain header)
- `five9-main` now supports two routing paths:
  - Route A: `x-tenant-id` → direct tenant CRM processing
  - Route B: `x-five9-domain` → domain-level webhook with callback writeback + notifications + CRM fan-out
- Deleted `five9-webhook/index.ts`
- Added `dispatchToGenericCrm` helper that delegates to `crm-push` for non-Legal CRMs

### Phase 8: Dead Code Removal ✅
- Deleted `five9-webhook/index.ts` (merged into five9-main)

## Remaining

### Phase 2: CRM Push Consolidation
- `crm-push` remains as standalone generic dispatcher
- `five9-main` now calls it for non-Legal CRM tenants via `dispatchToGenericCrm`

### Phase 6: Tenant Column Sprawl (separate ticket)
- Migrate 20+ individual API key columns into `integration_configs` JSONB
- Update TenantForm, useTenants, and edge functions to use unified source
