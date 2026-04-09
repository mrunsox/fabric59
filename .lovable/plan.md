

# Implementation Plan: Webhook Lifecycle + Examples Library + AI Prompt Packs

These three prompts cover reliability infrastructure, reference content, and AI operational tooling. Given the existing schema already has the right columns for webhook subscriptions, sync jobs, and event log, implementation focuses on edge functions, UI, and AI integration.

---

## Session 1: Webhook Lifecycle + Failure Recovery (Prompt 4)

### Database Changes (Migration)
- Add `legal_connect_failure_classifications` table: id, org_id, client_id, sync_job_id, event_log_id, classification (enum: invalid_signature, expired_subscription, renewal_failed, provider_unavailable, token_refresh_failed, unsupported_action, payload_validation_failed, duplicate_event, rate_limited, transient_network_error, downstream_write_failed, internal_processing_error, dead_lettered), is_retryable boolean, notes text, created_at
- Add `failure_classification` text column to `legal_connect_sync_jobs`
- Add `is_replay` boolean and `replay_source_id` uuid columns to `legal_connect_sync_jobs`
- Add `outage_mode` boolean column to `legal_connect_tenant_configs` (default false)
- Add `signature_valid` boolean and `raw_headers` jsonb columns to `legal_connect_event_log`

### Edge Functions

**`supabase/functions/legal-connect-webhooks/index.ts`** — Unified webhook receiver:
- Route by provider path param (`/clio`, `/mycase`)
- Raw payload persistence to event log
- Clio signature verification (HMAC-based per Clio docs)
- MyCase signature verification (capability-gated)
- Normalized event construction
- Idempotency check via event_key
- Sync job creation
- Reject invalid signatures with security logging

**`supabase/functions/legal-connect-jobs/index.ts`** — Sync job processor:
- Dequeue jobs by priority/next_attempt_at
- Provider-aware retry logic with exponential backoff
- Failure classification on each attempt
- Dead-letter after max_attempts
- Create review queue items for human-decision failures
- Replay support: accept replay_source_id, generate new idempotency key
- Outage mode: skip processing if tenant outage_mode is true, re-queue

**Update `legal-connect-admin/index.ts`** — Add actions:
- `renewWebhook`: renew a specific subscription
- `renewAllWebhooks`: renew all expiring subscriptions for a client
- `replayJob`: create replay from sync job or event log
- `toggleOutageMode`: pause/resume processing for a client
- `getWebhookHealth`: subscription health summary

### UI Changes

**New "Reliability" sub-section in Legal Connect** (add to Sync Activity tab or as sub-tabs):
- **Webhook Health**: subscription list with status, expires_at, renew_after, last_delivery, failure_count; manual renew button; auto-renewal schedule indicator
- **Dead Letter Queue**: filtered view of sync_jobs where status = 'dead_letter'; replay/suppress/escalate buttons
- **Failure Breakdown**: classification counts chart; drill-down to individual jobs
- **Outage Controls**: toggle outage mode per client; backlog count; drain status

**Hooks additions** to `useLegalConnect.ts`:
- `useLegalWebhookHealth(clientId)` — webhook subscriptions with health indicators
- `useReplayJob()` — mutation to replay a sync job
- `useToggleOutageMode()` — mutation for outage toggle

### Scheduled Renewal
- Use pg_cron to call `legal-connect-jobs` with action `renewExpiring` daily, targeting subscriptions where `renew_after < now()` and status = 'active'

---

## Session 2: Example Library (Prompt 5)

### Database Changes (Migration)
- Add `legal_connect_examples` table: id, provider text, category text (webhook, sync_job, review, transform, capability), scenario_key text unique, title text, description text, raw_payload jsonb, normalized_event jsonb, policy_decision jsonb, sync_jobs_emitted jsonb, review_triggers jsonb, ui_representation jsonb, tags text[], sort_order int, created_at

### Seed Data
Insert ~30 example rows covering:
- **Clio webhooks** (6): contact.created, contact.updated, matter.created, matter.updated, task.created, task.updated — each with raw payload, normalized event, expected sync jobs
- **Five9 call-driven scenarios** (6): intake_completed → Clio note, consult_booked → note+task+status, callback_requested → task, attorney_followup → priority task, unknown_caller → contact create + review, ambiguous_match → review queue
- **MyCase capability examples** (6): supported contact lookup, supported case lookup, conditional note creation, unsupported activity create (shows review item), unsupported webhook (shows capability UI), manual_only task creation
- **Normalized transform examples** (4): raw→normalized for each provider direction
- **Review queue examples** (5): ambiguous match, blocked field, duplicate candidate, missing mapping, expired webhook
- **Expected sync job outputs** (3): contact.upsert, note.create, review.required

### UI Changes
- Add **"Examples"** tab to LegalConnectPage (or as sub-tab under AI Setup)
- Category filter sidebar: Clio, MyCase, Five9, Transforms, Review
- Example card: title, description, expandable raw/normalized/sync JSON viewers
- "Explain with AI" button per example (calls AI assistant)

### Hooks
- `useLegalExamples(category?, provider?)` — query examples table with filters

---

## Session 3: AI Prompt Packs (Prompt 6)

### Database Changes (Migration)
- Add `legal_connect_prompt_templates` table: id, org_id (nullable for system defaults), prompt_key text, role text (admin/agent), category text, title text, description text, system_prompt text, input_schema jsonb, output_schema jsonb, enabled boolean default true, provider_notes jsonb, campaign_type_overrides jsonb, version int default 1, created_at, updated_at
- Unique on (org_id, prompt_key, version)

### Seed Data — System Prompt Templates (~15)
**Admin prompts:**
1. `guided_setup` — "Set up a safe Clio intake workflow..."
2. `pass_through_explainer` — "Explain which fields flow where..."
3. `mapping_recommender` — "Suggest disposition→action mappings..."
4. `failure_explainer` — "Explain why this webhook/sync failed..."
5. `go_live_readiness` — "Review readiness and find blockers..."
6. `policy_comparison` — "Compare two policy profiles..."
7. `recovery_checklist` — "Generate recovery steps for this failure..."

**Agent prompts:**
8. `call_context_summary` — "Summarize caller context in 4 bullets..."
9. `intake_assist` — "List missing intake fields and questions..."
10. `existing_client_support` — "Summarize open matter and recommend..."
11. `disposition_coach` — "Suggest correct disposition and follow-ups..."
12. `callback_next_steps` — "Summarize callback history and next action..."

Each template includes: system_prompt, input_schema (what context to feed), output_schema (expected structure), safety rules embedded in system prompt.

### Edge Function
**`supabase/functions/legal-connect-ai/index.ts`** — AI prompt executor:
- Actions: `executePrompt`, `listTemplates`, `previewPrompt`, `explainExample`
- Loads prompt template by key
- Merges client context (connection status, capabilities, policies, recent events) into input
- Calls Lovable AI gateway (gemini-2.5-flash for speed, gpt-5 for complex reasoning)
- Stores session in `legal_connect_ai_sessions`
- Returns structured markdown + optional JSON output
- Safety: strips blocked fields, enforces "no legal advice" constraint, respects provider capabilities

### UI Changes
**AI Setup tab overhaul** — replace placeholder cards with functional tools:
- Prompt category tabs: Setup, Explainer, Mapping, Reliability, Go-Live, Agent
- Per-prompt card: title, description, "Run" button, input form (pre-filled with client context), output panel with markdown rendering
- Template editor: edit system prompt, toggle enabled, preview with sample input
- Version history per template
- "Explain This" button on examples, review items, and sync failures → calls `explainExample` action

**Agent context panel** (new component `src/components/legal-connect/AgentContextPanel.tsx`):
- Compact card showing AI-generated call context summary
- Intake checklist
- Disposition hint
- Designed to be embeddable in agent-facing views

### Hooks additions
- `useLegalPromptTemplates(role?, category?)` — list templates
- `useExecutePrompt()` — mutation to run a prompt via edge function
- `useUpdatePromptTemplate()` — mutation to edit templates

---

## Execution Order

1. **Session 1** — Webhook lifecycle + failure recovery (DB migration, 2 edge functions, UI reliability tools)
2. **Session 2** — Example library (DB migration, seed data, Examples tab)
3. **Session 3** — AI prompt packs (DB migration, seed templates, AI edge function, AI Setup overhaul)

Each session is self-contained. Estimated: ~200 lines SQL, ~300 lines per edge function, ~400-500 lines UI per session.

