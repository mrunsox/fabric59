---
name: submission-output-pipeline
description: Phase 7 canonical submission pipeline — InteractionRecord, contact match, adapter writeback, notifications, sync log, retry. Reuses legal_connect_sync_jobs as queue and legal-connect-jobs worker for retries.
type: feature
---
Phase 7 wires the runner's Submit action to the canonical pipeline without
changing the Phase 6 callsite contract (`submitInteractionDraft(payload)`).

Architecture:
- Client (`src/lib/call-runner/submit.ts`): writes payload to localStorage
  outbox (audit + offline resilience), then invokes `interaction-pipeline`
  edge function with 3.5s hard timeout (non-blocking).
- Pure orchestrator (`src/lib/call-runner/pipeline/processInteraction.ts`):
  builds InteractionRecord, runs `resolveMatch`, calls `buildAdapterJobs` +
  `annotateWithContactLink`, calls `routeNotifications`, emits structured
  sync log + exceptions. Used by both edge function (mirrored in Deno) and
  tests (injected fakes).
- Edge function (`supabase/functions/interaction-pipeline/index.ts`):
  - Persists InteractionRecord to `platform_events` (event_type =
    `interaction.recorded`, correlation_id = deterministic interactionId).
  - Runs contact match against `legal_connect_contacts` (phone → email →
    name; ambiguous → review queue).
  - Upserts adapter writeback jobs onto `legal_connect_sync_jobs` keyed by
    `idempotency_key` so resubmits never duplicate.
  - Inserts notifications directly into `notifications` for fan-out.
  - Writes a row per step to `legal_connect_event_log` (sync log).
  - Fires `legal-connect-jobs` `processQueue` so jobs start immediately.

Retry: the existing `legal-connect-jobs` worker drains the queue with
exponential backoff (30s base, x3, capped at 15m), max 5 attempts. Failure
classification: `transient` retries, `permanent` (auth/validation/unsupported)
goes straight to dead_letter.

Idempotency: interactionId = `int_${callId}` so re-submitting the same call
produces the same id; platform_events insert checks for existing row;
sync_jobs upsert uses `onConflict: idempotency_key, ignoreDuplicates: true`.

Industry-neutral by design — legal-vertical specifics live in adapters.
