

# Integrate Script Orchestration into Fabric59 — DNIS Routing, Call Analytics, Goals, Partner Program, Summaries

## Current State

Fabric59 already has from prior merges:
- **scripts**, **script_sessions** tables with CRUD hooks
- **post_call_automations** table and rules engine
- **SupervisorPage** — wired to agents + script_sessions (no DNIS routing, no goals)
- **AgentDashboardPage** — wired to tasks + sessions + training
- **Partners** — basic CRUD (name, slug, status, billing rate), no referral/payout infrastructure
- **ScripterPage** — script runtime with session recording
- No campaign-to-script mapping, no call events, no outcome types, no goal tracking, no partner program, no summary templates

## What to Build

### Phase 1: Database Migration (8 new tables, 1 altered)

**`campaign_scripts`** — DNIS/campaign → script mapping
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id`, `five9_domain_id` (nullable)
- `five9_campaign_id` (text, nullable), `dnis` (text, nullable), `script_id` (FK scripts)
- `is_active` (boolean, default true), `created_by`, `created_at`, `updated_at`

**`call_sessions`** — Richer call lifecycle records (distinct from script_sessions)
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id` (nullable)
- `script_id` (FK scripts, nullable), `script_session_id` (FK script_sessions, nullable)
- `five9_call_id` (text), `agent_id` (FK agents, nullable)
- `dnis` (text, nullable), `ani` (text, nullable)
- `started_at`, `ended_at`, `duration_seconds`
- `status` (in_progress/completed/abandoned/transferred)
- `metadata` (JSONB)

**`call_session_events`** — Granular event log per call
- `id`, `call_session_id` (FK), `timestamp`, `event_type` (text), `node_id` (text, nullable), `data` (JSONB)

**`call_outcome_types`** — Configurable outcome definitions
- `id`, `organization_id`, `name`, `description`, `category` (text, nullable)

**`call_outcomes`** — Per-call outcome records
- `id`, `call_session_id` (FK), `outcome_type_id` (FK), `disposition` (text, nullable), `summary` (text), `created_at`

**`call_notes`** — Agent notes per call
- `id`, `call_session_id` (FK), `agent_id` (uuid), `note_text`, `created_at`

**`performance_goals`** — Goals and coaching
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id` (nullable)
- `name`, `description`, `metric` (text), `target_value` (numeric)
- `timeframe` (weekly/monthly/custom), `start_date`, `end_date` (nullable)
- `status` (active/archived), `created_by`, `created_at`, `updated_at`

**`call_summary_templates`** — Post-call summary templates
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id` (nullable)
- `name`, `template_body` (text), `channel` (email/sms/internal_note)
- `created_by`, `created_at`

All tables get standard org-scoped RLS policies matching existing patterns.

Partner referral tables (partner_applications, partner_referrals, partner_payouts, etc.) will be deferred — the existing Partners CRUD covers current needs, and a full referral/payout system is GTM infrastructure that should be built when the business model is ready.

### Phase 2: Hooks (6 new)

- **`useCampaignScripts.ts`** — CRUD for campaign_scripts (DNIS/campaign → script mapping)
- **`useCallSessions.ts`** — list/create/update call_sessions + call_notes
- **`useCallOutcomes.ts`** — outcome types CRUD + call outcome recording
- **`usePerformanceGoals.ts`** — goals CRUD + progress tracking
- **`useCallSummaryTemplates.ts`** — template CRUD
- **`useCallSessionEvents.ts`** — event insertion and querying

### Phase 3: New + Refactored Pages

**New: `ScriptRoutingPage.tsx`** (`/admin/script-routing`)
- Table of DNIS/campaign → script mappings filtered by org
- Add/edit mapping modal (select tenant, DNIS or campaign ID, script)
- Status toggle (active/inactive)

**New: `GoalsPage.tsx`** (`/admin/goals`)
- Goals list with status filters (active/archived)
- Create goal modal (name, metric, target, timeframe)
- Per-goal detail: target vs actual progress bar, coaching notes
- Assign to agents (simple multi-select)

**New: `CallSummaryTemplatesPage.tsx`** (`/admin/summary-templates`)
- Template list with CRUD
- Template editor with variable placeholders ({{client_name}}, {{disposition}}, etc.)
- Channel selector (email/sms/internal_note)

**Refactor: `SupervisorPage.tsx`** — Add two new tabs:
- **"Scripts & Routing"** tab: Embed campaign_scripts table inline (link to full page)
- **"Goals"** tab: Summary cards of active goals with progress

**Refactor: `AgentDashboardPage.tsx`** — Add:
- Call notes section (recent notes from call_notes)
- Goal progress card (my active goals with target vs actual)

### Phase 4: Navigation + Routes

Add to AdminLayout sidebar:
- Under "Agent Tools": "Script Routing" (`/admin/script-routing`)
- Under "Agent Tools": "Goals & Coaching" (`/admin/goals`)
- Under "Configuration": "Summary Templates" (`/admin/summary-templates`)

Add routes in App.tsx:
- `/admin/script-routing` → ScriptRoutingPage
- `/admin/goals` → GoalsPage
- `/admin/summary-templates` → CallSummaryTemplatesPage

## File Changes

| File | Change |
|---|---|
| Migration SQL | Create 8 tables + RLS + triggers |
| `src/hooks/useCampaignScripts.ts` | New |
| `src/hooks/useCallSessions.ts` | New |
| `src/hooks/useCallOutcomes.ts` | New |
| `src/hooks/usePerformanceGoals.ts` | New |
| `src/hooks/useCallSummaryTemplates.ts` | New |
| `src/hooks/useCallSessionEvents.ts` | New |
| `src/pages/admin/ScriptRoutingPage.tsx` | New — DNIS/campaign → script mapping UI |
| `src/pages/admin/GoalsPage.tsx` | New — Performance goals & coaching |
| `src/pages/admin/CallSummaryTemplatesPage.tsx` | New — Summary template manager |
| `src/pages/admin/SupervisorPage.tsx` | Add Scripts & Routing + Goals tabs |
| `src/pages/admin/AgentDashboardPage.tsx` | Add call notes + goal progress |
| `src/components/layout/AdminLayout.tsx` | Add 3 nav items |
| `src/App.tsx` | Add 3 routes |

## Scoping Decision

Partner referral/payout infrastructure (partner_applications, partner_referrals, partner_payouts, referral_link_clicks, partner_resources) is **deferred**. This is GTM infrastructure requiring business model decisions (commission rates, payout terms). The existing Partners CRUD in Fabric59 covers operational needs. When ready, it can be added as a standalone "Partner Program" module.

