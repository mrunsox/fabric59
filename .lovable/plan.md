

# Phase 6 + Batch 2 Implementation Plan

## Part A: Phase 6 — Consolidate Tenant API Keys into integration_configs JSONB

### Database Migration
Create a migration that copies all 20+ individual API key column values into the `integration_configs` JSONB column using a structured schema. Columns are NOT dropped (backward compat), but all code will read/write from `integration_configs` only going forward.

The migration SQL will:
- For each tenant row, merge existing flat columns into `integration_configs` under categorized keys:
  - `webhooks.slack`, `webhooks.zapier`, `webhooks.make`, `webhooks.pabbly`, `webhooks.n8n`, `webhooks.teams`, `webhooks.power_automate`, `webhooks.general`
  - `twilio.account_sid`, `twilio.auth_token`, `twilio.from_number`
  - `scheduling.zoom_api_key`, `scheduling.google_calendar_id`, `scheduling.calendly_api_key`, `scheduling.microsoft365_api_key`, `scheduling.asana_api_key`
  - `billing.stripe_api_key`, `billing.quickbooks_api_key`
  - `documents.docusign_api_key`, `documents.dropbox_api_key`
  - `ai.openai_api_key`
  - `crm.api_url`, `crm.api_key`

### Code Changes

**`src/types/database.ts`** — Slim down `Tenant` interface: remove 20+ individual fields, keep only `integration_configs: IntegrationConfigsUnified`. Add `IntegrationConfigsUnified` type with the categorized structure. Keep backward-compat getter helpers.

**`src/types/integrations.ts`** — Add the unified `IntegrationConfigsUnified` type alongside existing `IntegrationConfigs` (CRM rules stay separate).

**`src/hooks/useTenants.ts`** — Simplify mapper: read all integration values from `integration_configs` JSONB. Create/update mutations write to `integration_configs` only. Remove 40+ lines of individual field mapping.

**`src/components/tenants/TenantForm.tsx`** — Refactor form schema: fields like `slack_webhook_url` become nested paths in `integration_configs`. Form reads/writes from the JSONB structure. The UI sections (Notifications, Automations, Communication, etc.) stay the same visually.

**`src/pages/admin/TenantsPage.tsx`** — Update `INTEGRATION_ICONS` to read from `integration_configs.webhooks.slack` instead of `tenant.slack_webhook_url`.

**Edge functions** (`twilio-sms`, `send-notification`, etc.) — Update to fetch `integration_configs` from the tenant row and read nested keys.

---

## Part B: Batch 2 — Agent Runtime + Analytics Components

### Agent Runtime (5 components)

1. **`src/components/agent/AgentCallNotesInput.tsx`** (~250 lines)
   - Real-time call notes textarea with auto-save to `call_outcomes` or a `call_notes` field on `script_sessions`
   - Debounced save, character count, timestamp markers

2. **`src/components/agent/PostCallSummary.tsx`** (~200 lines)
   - Auto-generated summary card shown after call ends
   - Displays disposition, duration, notes, next steps
   - "Send Summary" button triggers email/SMS via `send-call-summary` edge function pattern

3. **`src/components/agent/TaskQueuePanel.tsx`** (~300 lines)
   - Lists tasks from `tasks` table assigned to current agent
   - Filter by priority/status, mark complete inline
   - Uses existing `useTasks` hook

4. **`src/components/agent/CallbackRemindersPanel.tsx`** (~250 lines)
   - Shows upcoming callbacks from `tasks` table where type = 'callback'
   - Countdown timer, click-to-call button, snooze/dismiss

5. **`src/components/agent/AINodeSuggestions.tsx`** (~200 lines)
   - Given current script node context, shows AI-suggested next actions
   - Calls Lovable AI (gemini-2.5-flash) via edge function for suggestions
   - Displays as a small floating card with 2-3 suggestion chips

### Analytics Components (4 components)

6. **`src/components/analytics/LiveMonitoringPanel.tsx`** (~300 lines)
   - Real-time grid of active agents with status (on-call, idle, ACW)
   - Uses `script_sessions` where `ended_at IS NULL` as proxy for active calls
   - Auto-refreshes every 10s

7. **`src/components/analytics/CallSessionAnalytics.tsx`** (~250 lines)
   - Charts: call volume by hour, average handle time trend, calls by disposition
   - Uses `script_sessions` + `call_sessions` data via existing hooks
   - Recharts bar/line charts

8. **`src/components/analytics/OutcomeAnalyticsDashboard.tsx`** (~300 lines)
   - Disposition breakdown pie chart + table
   - Filter by date range, tenant, agent
   - Uses `call_outcomes` + `call_outcome_types` via existing hooks

9. **`src/components/analytics/PathAnalyticsDashboard.tsx`** (~250 lines)
   - Script path frequency analysis — which nodes are visited most
   - Uses `call_session_events` aggregated by `node_id`
   - Sankey-style or bar chart of top paths

### New Hooks

10. **`src/hooks/useCallbackReminders.ts`** — Queries `tasks` filtered to callback type with upcoming due dates
11. **`src/hooks/useAgentPresence.ts`** — Queries active `script_sessions` to derive agent online/idle/on-call status

### New Edge Function

12. **`supabase/functions/ai-suggestions/index.ts`** — Takes current node context, calls Lovable AI for suggested next steps

### Page Updates

- **`AgentDashboardPage.tsx`** — Add tabs: "Overview" (existing), "Notes" (AgentCallNotesInput), "Tasks" (TaskQueuePanel), "Callbacks" (CallbackRemindersPanel)
- **`SupervisorPage.tsx`** — Add "Live Monitor" and "Analytics" tabs with LiveMonitoringPanel, CallSessionAnalytics, OutcomeAnalyticsDashboard
- **`App.tsx`** — No new routes needed; components integrate into existing pages

### Implementation Order
1. Database migration (integration_configs consolidation)
2. Update types + hooks + TenantForm + TenantsPage
3. Update edge functions
4. Create agent runtime components (5)
5. Create analytics components (4)
6. Create hooks + edge function
7. Wire into AgentDashboardPage + SupervisorPage

