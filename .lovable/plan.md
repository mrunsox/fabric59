

# Consolidate and Align All Integrated Modules — Phased Refactor Plan

## Assessment Summary

After thorough codebase analysis, the backend is already well-structured. The database schema is coherent with proper org → partner → tenant hierarchy, RLS via SECURITY DEFINER helpers, and normalized views. The main issues are:

1. **Duplicate Five9 webhook endpoints** (`five9-webhook` and `five9-main` overlap)
2. **Duplicate type files** (`src/types/database.ts` duplicates auto-generated `types.ts`)
3. **Stub hooks** (`useDispositions.ts` returns empty arrays)
4. **Scattered integration types** (`tree-integration.ts` vs `integrations.ts` vs `database.ts`)
5. **`crm-push` edge function** overlaps with `five9-main`'s CRM handling
6. **`tenants` table** has 20+ individual API key columns that should all live in `integration_configs` JSONB

The database tables themselves are already canonical — no duplicate tables exist. The work is primarily code-level consolidation.

## Phase 1: Merge Five9 Webhook Endpoints

**Problem:** `five9-webhook` and `five9-main` are two separate entrypoints for Five9 events. `five9-webhook` validates via `x-five9-domain` header + domain-level webhook secret. `five9-main` validates via `x-tenant-id` header + tenant-level integration config secrets. They should be one function.

**Action:**
- Merge `five9-webhook` logic into `five9-main` as a secondary validation path
- `five9-main` becomes the single Five9 event entrypoint, accepting either routing approach:
  - Route A: `x-tenant-id` header (direct tenant identification)
  - Route B: `x-five9-domain` header (domain-level, resolves tenants)
- Add `five9-webhook`'s web callback writeback logic and downstream notification triggering into `five9-main`
- After merging, delete `five9-webhook/index.ts` and remove from `config.toml`

## Phase 2: Consolidate CRM Push

**Problem:** `crm-push` is a generic REST adapter. `five9-main` has specific Clio/MyCase adapters. They serve different purposes but the generic one is unused in practice.

**Action:**
- Keep `crm-push` as a standalone generic CRM dispatcher for non-Legal CRM types (Salesforce, HubSpot, etc.)
- Add a call from `five9-main` to `crm-push` for non-Clio/non-MyCase tenants, instead of duplicating adapter logic
- This makes `five9-main` the router and `crm-push` the generic handler

## Phase 3: Consolidate Type Files

**Problem:** Three competing type sources:
- `src/types/database.ts` — 266 lines of hand-written types that duplicate auto-generated `types.ts`
- `src/types/tree-script.ts` — 313 lines from Virtual Script project
- `src/types/tree-integration.ts` — 120 lines from Virtual Script project  
- `src/types/integrations.ts` — Fabric59's canonical CRM rules
- `src/types/script.ts` — just a re-export of `tree-script.ts`

**Action:**
- Delete `src/types/database.ts` — all code should import from `@/integrations/supabase/types` for DB row types
- Update all imports of `database.ts` types to use the auto-generated types or inline type aliases
- Keep `src/types/integrations.ts` as the canonical integration config types
- Keep `src/types/tree-script.ts` and `src/types/tree-integration.ts` as tree-editor-specific frontend types (not DB types)
- Delete `src/types/script.ts` re-export, update tree-editor imports to use `tree-script` directly

## Phase 4: Fix Stub Hooks

**Problem:** `useDispositions.ts` is a stub that returns empty arrays. Tree editor components depend on it.

**Action:**
- Rewrite `useDispositions.ts` to query `disposition_access` table (which is Fabric59's real disposition source)
- Map `disposition_access` rows to the `Disposition` interface the tree editor expects
- For create/delete, wire to Five9 provisioning function via `useFive9Dispositions` patterns

## Phase 5: Consolidate Session Hooks

**Problem:** Two session concepts:
- `useCallSessions` → queries `call_sessions` table (telephony-level: ANI/DNIS, Five9 call ID)
- `useScriptSessions` → queries `script_sessions` table (script execution: variables, disposition, post-call status)

These are NOT duplicates — `call_sessions` tracks the phone call, `script_sessions` tracks what the agent did in the script during that call. `call_sessions.script_session_id` links them.

**Action:** No merge needed. Add a comment/doc header to each hook clarifying the distinction. Add a `useLinkedSession` helper that joins the two when both exist.

## Phase 6: Clean Up Tenant Column Sprawl

**Problem:** `tenants` table has 20+ individual API key columns (`slack_webhook_url`, `zapier_webhook_url`, `twilio_account_sid`, etc.) alongside the `integration_configs` JSONB column that was designed to replace them.

**Action:**
- Create a migration to move all individual API key column values into `integration_configs` JSONB
- Keep the columns as nullable for backward compatibility (no DROP yet)
- Update `TenantForm.tsx` and `useTenants.ts` to read/write from `integration_configs` instead of individual columns
- Update edge functions (`crm-push`, `send-notification`, `twilio-sms`, etc.) to read from `integration_configs`

## Phase 7: Wire `resolveEffectiveConfig` Everywhere

**Problem:** `mergeIntegrationConfigs` in `src/lib/config-merge.ts` exists but isn't used consistently. Some code reads tenant configs directly without inheritance.

**Action:**
- Create `resolveEffectiveConfig(orgConfigs, partnerConfigs, tenantConfigs)` utility (already exists as `mergeIntegrationConfigs`)
- Rename for clarity: `mergeIntegrationConfigs` → export also as `resolveEffectiveConfig`
- Audit all edge functions and hooks that read `integration_configs` to ensure they merge org → partner → tenant
- Add the merge call to `five9-main` before dispatching to CRM adapters

## Phase 8: Dead Code Removal

**Files to delete:**
- `src/types/database.ts` (replaced by auto-generated types)
- `src/types/script.ts` (pointless re-export)
- `supabase/functions/five9-webhook/index.ts` (merged into five9-main)
- Any mock integration pages or unused provider arrays in `integrations-catalog.ts` that have no corresponding edge function

**Hooks to verify usage:**
- `useConnectionDrawing.ts`, `useDraggableNode.ts` — only used by legacy drag-based editor, tree-editor uses React Flow. Keep if TreeEditorPage still references them.

## Implementation Order

| Step | Effort | Risk |
|---|---|---|
| Phase 3: Type consolidation | Small | Low — find-replace imports |
| Phase 4: Fix disposition stub | Small | Low — wires to existing table |
| Phase 8: Dead code removal | Small | Low — delete unused files |
| Phase 5: Session hook docs | Tiny | None |
| Phase 7: Config merge audit | Medium | Low — additive |
| Phase 1: Merge Five9 webhooks | Medium | Medium — must test both routing paths |
| Phase 2: CRM push consolidation | Medium | Medium — touches live integration path |
| Phase 6: Tenant column migration | Large | Medium — data migration |

I recommend implementing Phases 3, 4, 5, 8 first (low-risk cleanup), then Phases 1, 2, 7, and finally Phase 6 as a separate ticket.

