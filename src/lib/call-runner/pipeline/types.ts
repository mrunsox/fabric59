/**
 * Phase 7 — Submission → output pipeline.
 *
 * Pure types for the canonical interaction pipeline. Industry-neutral; no
 * legal vocabulary in this file. The pipeline is invoked from the runner's
 * Submit action via `submitInteractionDraft(payload)`; downstream side effects
 * (contact match, adapter writeback, notification routing) happen
 * asynchronously and are tracked via the sync log + exception queue.
 */
import type { InteractionDraftPayload } from "@/types/call-runner";

export const INTERACTION_RECORD_SCHEMA_VERSION = 1 as const;

export interface InteractionRecord {
  schemaVersion: typeof INTERACTION_RECORD_SCHEMA_VERSION;
  /** Stable id derived from the payload (callId or generated). Used as
   *  the idempotency key for all downstream queue entries. */
  id: string;
  workspaceId: string;
  campaignId: string;
  startedAt: string;
  finalizedAt: string;
  ani: string | null;
  outcomeCode: string | null;
  values: Record<string, unknown>;
  notes: string;
  copilotSummary?: string;
  copilotSuggestedTargets?: string[];
  completedStepIds: string[];
}

export type ContactCandidate = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  lastActivityAt?: string | null;
};

export type ContactMatchOutcome =
  | { kind: "linked"; contact: ContactCandidate; via: "phone" | "email" | "name_plus_email" | "name_plus_phone" }
  | { kind: "ambiguous"; candidates: ContactCandidate[]; via: string; chosen: ContactCandidate | null }
  | { kind: "none" };

export interface AdapterWritebackJobInput {
  provider: string;
  connectionId: string;
  action: "create_intake" | "log_client_note" | "create_followup_task" | "update_contact_or_matter";
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface NotificationJobInput {
  channel: "email" | "slack" | "webhook" | "internal";
  recipient: string;
  triggerEvent: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export type RetryClass = "transient" | "permanent";

export interface SyncLogEntry {
  interactionId: string;
  step:
    | "interaction_record_created"
    | "contact_match"
    | "adapter_writeback_enqueued"
    | "notification_enqueued"
    | "pipeline_completed"
    | "pipeline_error";
  status: "success" | "failed" | "retrying" | "skipped";
  attempt?: number;
  message?: string;
  details?: Record<string, unknown>;
  at: string;
}

export interface ProcessInteractionResult {
  interaction: InteractionRecord;
  contactMatch: ContactMatchOutcome;
  adapterJobs: AdapterWritebackJobInput[];
  notificationJobs: NotificationJobInput[];
  log: SyncLogEntry[];
  exceptions: Array<{ operation: string; reason: string; lastError?: string }>;
}

/** Convenience type alias re-exporting the fixed Phase 6 contract. */
export type { InteractionDraftPayload };
