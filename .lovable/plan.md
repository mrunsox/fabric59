

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
- `five9-main` now supports two routing paths
- Deleted `five9-webhook/index.ts`
- Added `dispatchToGenericCrm` helper

### Phase 8: Dead Code Removal ✅
- Deleted `five9-webhook/index.ts` (merged into five9-main)

### Phase 6: Tenant Column Consolidation ✅
- Ran data migration to copy all 20+ flat API key columns into `integration_configs` JSONB
- Added `IntegrationConfigsUnified` type with categorized structure (webhooks, twilio, scheduling, billing, documents, ai, crm)
- Updated `useTenants.ts` mapper to read from `integration_configs` with flat column fallback
- Updated `useCreateTenant` and `useUpdateTenant` to always write `integration_configs`
- Updated `send-notification` edge function to read webhooks from `integration_configs`
- Flat columns retained for backward compatibility (no DROP)

### Batch 2: Agent Runtime & Analytics ✅
- Created 5 agent runtime components:
  - `AgentCallNotesInput` — real-time call notes with save to `call_notes` table
  - `PostCallSummary` — post-call summary card with disposition, duration, captured data
  - `TaskQueuePanel` — filterable task queue with priority sorting and inline completion
  - `CallbackRemindersPanel` — upcoming callbacks with countdown timers
  - `AINodeSuggestions` — AI-powered next-action suggestions via `ai-suggestions` edge function
- Created 4 analytics components:
  - `LiveMonitoringPanel` — real-time agent presence grid (10s refresh)
  - `CallSessionAnalytics` — call volume by hour + AHT trend charts
  - `OutcomeAnalyticsDashboard` — disposition pie chart + detail table
  - `PathAnalyticsDashboard` — script node frequency analysis
- Created 2 new hooks:
  - `useCallbackReminders` — queries callback-type tasks with due dates
  - `useAgentPresence` — derives agent status from active script_sessions
- Created `ai-suggestions` edge function
- Wired into `AgentDashboardPage` with tabs: Overview, Tasks, Notes, Callbacks, AI Assist
- Wired into `SupervisorPage` with tabs: Live Monitor, Analytics

## Remaining

### Phase 2: CRM Push Consolidation
- `crm-push` remains as standalone generic dispatcher
- `five9-main` calls it for non-Legal CRM tenants via `dispatchToGenericCrm`
