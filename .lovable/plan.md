

# Second-Wave Hardening: Webhook Reliability + Testing + Examples + AI Prompts

Four parts delivered in order: reliability first, validation second, examples third, AI tooling fourth.

---

## What Already Exists

- `legal_connect_webhook_subscriptions` table with expires_at, renew_after, failure_count, status, remote_webhook_id, events, callback_url
- `legal-connect-webhooks` edge function (signature verification, normalization, idempotency, sync job creation)
- `legal-connect-jobs` edge function (queue processing, retry/backoff, dead-letter, replay, renewExpiring — currently 7-day renewal)
- `legal-connect-admin` edge function (renewWebhook at 7 days, toggleOutageMode, getWebhookHealth)
- `legal_connect_failure_classifications` table with full classification enum
- ReliabilityPanel UI (webhook health table, dead letter queue, failure breakdown, outage toggle)
- 23 Legal Connect tables total

---

## Part A: Clio 31-Day Renewal Hardening

### Database migration
- Add `legal_connect_webhook_renewal_log` table (id, subscription_id, org_id, client_id, action text, previous_expires_at, new_expires_at, success boolean, error_message, created_at)
- Add `health_status` text and `disabled_reason` text columns to `legal_connect_webhook_subscriptions`

### Edge function changes
- **legal-connect-admin**: Update `renewWebhook` to 31-day expiry with 25-day renew_after. Add `recreateWebhook`, `disableWebhook`, `enableWebhook`, `getWebhookRenewalLog` actions. Log all actions to renewal_log table.
- **legal-connect-jobs**: Update `renewExpiring` to 31-day expiry. Add auto-recreate when renewal fails 3x but connection is still valid. Compute health_status (healthy/degraded/critical/expired) based on expiry distance and failure_count.

### ReliabilityPanel UI
- Expiration countdown (days remaining)
- Health status badge (healthy/degraded/critical/expired/disabled)
- Recreate, Disable/Enable buttons
- Renewal history expandable section
- Replay Recent Events button per subscription

---

## Part B: Testing Framework

### Database migration
- `legal_connect_test_runs` (id, org_id, client_id, test_type, test_category, test_config jsonb, expected_output jsonb, actual_output jsonb, status text, correlation_id, error_message, duration_ms, created_at)
- `legal_connect_test_plans` (id, org_id, client_id, plan_name, test_cases jsonb, generated_by, provider, campaign_types text[], status, created_at)

### Edge function: `legal-connect-test`
- `simulateClioWebhook`: Generate Clio payload, run normalization pipeline dry-run
- `simulateMyCaseEvent`: Same, capability-gated
- `simulateDisposition`: Five9 post-disposition dry-run
- `simulateLookup`: Contact/matter match test
- `simulateRenewalFailure`, `simulateOutage`: Reliability scenario tests
- `runTestPlan`, `generateTestPlan`: Batch test execution + AI plan generation

### UI: TestingPanel component
- Category tabs: Clio Webhooks, MyCase Events, Dispositions, Lookups, Reliability
- Input form with presets, Expected vs Actual viewer, pass/fail badges
- Test history table, export report button, AI-generated test plans

---

## Part C: Provider Examples Library

### Database migration
- `legal_connect_examples` (id, provider, category, scenario_key unique, title, description, raw_payload jsonb, normalized_event jsonb, policy_decision jsonb, sync_jobs_emitted jsonb, review_triggers jsonb, capability_check jsonb, five9_input jsonb, tags text[], sort_order, created_at)

### Seed data (~30 examples via insert tool)
- 6 Clio webhook examples (contact/matter/task CRUD)
- 6 Five9 call-driven scenarios (intake, consult, callback, unknown caller, ambiguous match)
- 8 MyCase capability-aware examples (supported/conditional/unsupported actions)
- 4 normalized transform examples
- 5 review queue examples

### UI: ExamplesPanel component
- Category filter sidebar, example cards with expandable JSON viewers
- Capability status indicators for MyCase
- "Explain with AI" button per example

---

## Part D: Admin AI Prompt Packs

### Database migration
- `legal_connect_prompt_templates` (id, org_id nullable, prompt_key, role, category, title, description, system_prompt text, input_schema jsonb, output_schema jsonb, enabled boolean, provider_notes jsonb, campaign_type_overrides jsonb, version int, created_at, updated_at)

### Seed data (~13 templates via insert tool)
- 8 admin prompts: partner_onboarding, client_onboarding, pass_through_explainer, mapping_recommender, failure_explainer, go_live_readiness, policy_comparison, recovery_checklist
- 5 agent prompts: call_context_summary, intake_assist, existing_client_support, disposition_coach, callback_next_steps

### Edge function: `legal-connect-ai`
- `executePrompt`: Load template, merge client context, call Lovable AI gateway (gemini-2.5-flash)
- `listTemplates`, `previewPrompt`, `explainExample`
- Safety: no legal advice, strip blocked fields, respect provider capabilities

### UI: AISetupPanel + AgentContextPanel
- Prompt category tabs, per-prompt run/preview cards, template editor
- AgentContextPanel: compact context summary for agent-facing views

---

## File Summary

**New files (6):**
- `supabase/functions/legal-connect-test/index.ts`
- `supabase/functions/legal-connect-ai/index.ts`
- `src/components/legal-connect/TestingPanel.tsx`
- `src/components/legal-connect/ExamplesPanel.tsx`
- `src/components/legal-connect/AISetupPanel.tsx`
- `src/components/legal-connect/AgentContextPanel.tsx`

**Modified files (5):**
- `supabase/functions/legal-connect-admin/index.ts` — 31-day renewal, recreate/disable/enable actions
- `supabase/functions/legal-connect-jobs/index.ts` — 31-day renewal, auto-recreate, health computation
- `src/hooks/useLegalConnect.ts` — test, example, prompt, and renewal log hooks
- `src/pages/admin/LegalConnectPage.tsx` — wire new panels into Testing/Examples/AI tabs
- `src/components/legal-connect/ReliabilityPanel.tsx` — health status, countdown, new action buttons

**1 database migration** (all tables + columns combined)
**2 data inserts** (examples seed + prompt templates seed)

### Execution order
1. Database migration (all new tables + columns)
2. Seed examples + prompt templates
3. Update legal-connect-admin + legal-connect-jobs for 31-day Clio renewal
4. Create legal-connect-test edge function
5. Create legal-connect-ai edge function
6. Build all UI panels
7. Wire into LegalConnectPage + hooks

