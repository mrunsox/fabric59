/**
 * Phase 6 · submission boundary.
 *
 * The runner's Submit action lands here. In Phase 6 we deliberately do NOT
 * perform any external writeback, contact match, notification dispatch, sync
 * log, or retry — those are Phase 7's responsibility.
 *
 * What this module DOES:
 *  - Build the canonical InteractionDraftPayload shape.
 *  - Hand it to a local in-memory + localStorage queue so Phase 7 can replace
 *    `submitInteractionDraft` with a real edge-function call without changing
 *    any callsite.
 *  - Emit a console.info trace tagged with `[fabric59 phase6 submit]` so the
 *    runtime is observable during pilot use.
 */
import type {
  CallSessionState,
  CopilotResult,
  InteractionDraftPayload,
} from "@/types/call-runner";

const QUEUE_KEY = "fabric59:call-runner:pending-interactions";

export function buildInteractionPayload(
  session: CallSessionState,
  copilot: CopilotResult | null,
): InteractionDraftPayload {
  const outcomeCode =
    typeof session.values.__outcome__ === "string" ? (session.values.__outcome__ as string) : null;
  const summary = copilot?.suggestions.find((s) => s.kind === "draft_summary")?.body;
  const targets = copilot?.suggestions
    .filter((s) => s.kind === "notification_target")
    .map((s) => s.title);
  return {
    schemaVersion: 1,
    meta: session.meta,
    values: session.values,
    notes: session.notes,
    outcomeCode,
    copilot: {
      draftSummary: summary,
      suggestedNotificationTargets: targets && targets.length > 0 ? targets : undefined,
    },
    completedStepIds: session.completedStepIds,
    finalizedAt: new Date().toISOString(),
  };
}

/**
 * Phase 6 stub — appends to a localStorage queue and logs. Phase 7 replaces this
 * with a real call into the InteractionRecord pipeline (edge function).
 */
export async function submitInteractionDraft(payload: InteractionDraftPayload): Promise<{ queuedAt: string }> {
  const queuedAt = new Date().toISOString();
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(QUEUE_KEY);
      const list: Array<{ queuedAt: string; payload: InteractionDraftPayload }> = raw ? JSON.parse(raw) : [];
      list.push({ queuedAt, payload });
      // Cap queue length defensively so we don't unbound localStorage.
      const capped = list.slice(-50);
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(capped));
    }
  } catch {
    /* non-fatal */
  }
  if (typeof console !== "undefined") {
    console.info("[fabric59 phase6 submit] interaction draft queued", { queuedAt, payload });
  }
  return { queuedAt };
}

/** Test/inspection helper — drain the queue without consuming it. */
export function readPendingInteractions(): Array<{ queuedAt: string; payload: InteractionDraftPayload }> {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
