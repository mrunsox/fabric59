/**
 * Phase 7 — orchestrator.
 *
 * Pure orchestration: turns an `InteractionDraftPayload` (Phase 6 boundary)
 * into a fully resolved set of outputs — InteractionRecord + contact match
 * + adapter writeback jobs + notification jobs + a structured sync log +
 * an exceptions list.
 *
 * The orchestrator never performs IO itself. Side effects (DB writes,
 * adapter calls, notification dispatch) are the caller's responsibility:
 *   - in the browser, the caller is `submitInteractionDraft`, which posts
 *     to the `interaction-pipeline` edge function;
 *   - in the edge function, the caller is the function body, which uses
 *     the supabase service role client to persist results;
 *   - in tests, the caller injects fakes via the same shape.
 *
 * Idempotency: the InteractionRecord's `id` is derived from the runner
 * call id (or generated). All enqueued jobs key off that id, so retrying
 * `processInteraction` for the same payload never duplicates downstream
 * records once the worker dedups by `idempotency_key`.
 */
import type { InteractionDraftPayload } from "@/types/call-runner";
import type {
  AdapterWritebackJobInput,
  ContactCandidate,
  ContactMatchOutcome,
  InteractionRecord,
  NotificationJobInput,
  ProcessInteractionResult,
  SyncLogEntry,
} from "./types";
import { INTERACTION_RECORD_SCHEMA_VERSION } from "./types";
import { resolveMatch } from "./contactMatch";
import {
  annotateWithContactLink,
  buildAdapterJobs,
  type IntegrationConnection,
} from "./adapterMapping";
import {
  routeNotifications,
  type WorkspaceNotificationRule,
} from "./notificationRouting";
import type { FlowOutputMapping } from "@/types/campaign-flow";

export interface ProcessInteractionInput {
  payload: InteractionDraftPayload;
  contactCandidates: ContactCandidate[];
  mappings: FlowOutputMapping[];
  connections: IntegrationConnection[];
  notificationRules: WorkspaceNotificationRule[];
  fallbackInternalRecipient?: string;
  /** Optional id override for tests / replays. */
  interactionId?: string;
  /** Wall-clock for deterministic logs in tests. */
  now?: () => Date;
}

export function buildInteractionRecord(
  payload: InteractionDraftPayload,
  interactionId?: string,
): InteractionRecord {
  const id =
    interactionId ??
    payload.meta.callId ??
    `int_${payload.meta.workspaceId}_${payload.meta.campaignId}_${payload.finalizedAt}`;
  return {
    schemaVersion: INTERACTION_RECORD_SCHEMA_VERSION,
    id,
    workspaceId: payload.meta.workspaceId,
    campaignId: payload.meta.campaignId,
    startedAt: payload.meta.startedAt,
    finalizedAt: payload.finalizedAt,
    ani: payload.meta.ani ?? null,
    outcomeCode: payload.outcomeCode,
    values: payload.values,
    notes: payload.notes,
    copilotSummary: payload.copilot?.draftSummary,
    copilotSuggestedTargets: payload.copilot?.suggestedNotificationTargets,
    completedStepIds: payload.completedStepIds,
  };
}

export function processInteraction(input: ProcessInteractionInput): ProcessInteractionResult {
  const now = input.now ?? (() => new Date());
  const log: SyncLogEntry[] = [];
  const exceptions: ProcessInteractionResult["exceptions"] = [];

  const interaction = buildInteractionRecord(input.payload, input.interactionId);
  log.push({
    interactionId: interaction.id,
    step: "interaction_record_created",
    status: "success",
    at: now().toISOString(),
    details: { schemaVersion: interaction.schemaVersion, outcome: interaction.outcomeCode },
  });

  // Contact match
  let contactMatch: ContactMatchOutcome = { kind: "none" };
  try {
    contactMatch = resolveMatch(interaction, input.contactCandidates);
    log.push({
      interactionId: interaction.id,
      step: "contact_match",
      status: "success",
      at: now().toISOString(),
      details:
        contactMatch.kind === "linked"
          ? { kind: "linked", via: contactMatch.via, contactId: contactMatch.contact.id }
          : contactMatch.kind === "ambiguous"
            ? {
                kind: "ambiguous",
                via: contactMatch.via,
                chosenId: contactMatch.chosen?.id ?? null,
                count: contactMatch.candidates.length,
              }
            : { kind: "none" },
    });
    if (contactMatch.kind === "ambiguous") {
      exceptions.push({
        operation: "contact_match",
        reason: `Ambiguous match via ${contactMatch.via} (${contactMatch.candidates.length} candidates)`,
      });
    }
  } catch (e) {
    const msg = (e as Error).message;
    log.push({
      interactionId: interaction.id,
      step: "contact_match",
      status: "failed",
      at: now().toISOString(),
      message: msg,
    });
    exceptions.push({ operation: "contact_match", reason: "match_resolver_threw", lastError: msg });
  }

  // Adapter writebacks
  const adapterJobs = annotateWithContactLink(
    buildAdapterJobs(interaction, input.mappings, input.connections),
    contactMatch,
  );
  for (const job of adapterJobs) {
    log.push({
      interactionId: interaction.id,
      step: "adapter_writeback_enqueued",
      status: "success",
      at: now().toISOString(),
      details: { provider: job.provider, action: job.action, idempotencyKey: job.idempotencyKey },
    });
  }

  // Notifications
  const notificationJobs = routeNotifications({
    rec: interaction,
    rules: input.notificationRules,
    fallbackInternalRecipient: input.fallbackInternalRecipient,
    copilotSuggestedTargets: interaction.copilotSuggestedTargets,
  });
  for (const job of notificationJobs) {
    log.push({
      interactionId: interaction.id,
      step: "notification_enqueued",
      status: "success",
      at: now().toISOString(),
      details: { channel: job.channel, recipient: job.recipient, idempotencyKey: job.idempotencyKey },
    });
  }

  log.push({
    interactionId: interaction.id,
    step: "pipeline_completed",
    status: "success",
    at: now().toISOString(),
    details: {
      adapterJobs: adapterJobs.length,
      notificationJobs: notificationJobs.length,
      exceptions: exceptions.length,
    },
  });

  return { interaction, contactMatch, adapterJobs, notificationJobs, log, exceptions };
}
