/**
 * Phase 6 → Phase 7 · submission boundary.
 *
 * The runner's Submit action lands here. The callsite contract and the
 * `InteractionDraftPayload` shape are FIXED (Phase 6). Phase 7 replaces the
 * internals: instead of only enqueueing to localStorage, we now invoke the
 * `interaction-pipeline` edge function which:
 *   - persists the canonical InteractionRecord,
 *   - runs contact match,
 *   - enqueues adapter writeback + notification jobs onto
 *     `legal_connect_sync_jobs` (drained by `legal-connect-jobs` with retry),
 *   - writes sync log entries + populates the exception queue.
 *
 * The localStorage queue is RETAINED as a resilience outbox: when the edge
 * function call fails (network blip, offline pilot, test env), the payload
 * still survives and can be replayed by a future admin tool. The runner UX
 * stays non-blocking — we fire the edge function but resolve as soon as the
 * outbox + the in-flight invocation have settled (the invocation has a hard
 * timeout so a stuck network never blocks the agent).
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  CallSessionState,
  CopilotResult,
  InteractionDraftPayload,
} from "@/types/call-runner";

const QUEUE_KEY = "fabric59:call-runner:pending-interactions";
const INVOKE_TIMEOUT_MS = 3500;

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
 * Phase 7 — invokes the real pipeline edge function. The local outbox is
 * always written (audit + offline resilience). The edge invocation is
 * best-effort with a short hard timeout so the agent UI never blocks.
 */
export async function submitInteractionDraft(
  payload: InteractionDraftPayload,
): Promise<{ queuedAt: string; interactionId?: string; pipelineStatus?: "accepted" | "deferred" }>{
  const queuedAt = new Date().toISOString();

  // 1. Always write to the local outbox first — this is the resilience layer
  //    and the contract the Phase 6 regression suite still verifies.
  appendToOutbox(queuedAt, payload);

  // 2. Fire the canonical pipeline. Short timeout + structured failure
  //    handling keep the runner non-blocking.
  let interactionId: string | undefined;
  let pipelineStatus: "accepted" | "deferred" = "deferred";
  try {
    const res = await withTimeout(
      supabase.functions.invoke("interaction-pipeline", { body: { payload } }),
      INVOKE_TIMEOUT_MS,
    );
    if (res && typeof res === "object" && "data" in res && res.data && typeof res.data === "object") {
      const data = res.data as { interactionId?: string; ok?: boolean };
      interactionId = data.interactionId;
      pipelineStatus = data.ok ? "accepted" : "deferred";
    }
  } catch (err) {
    // Non-fatal: the outbox row will be replayed by a future admin tool.
    if (typeof console !== "undefined") {
      console.warn("[fabric59 phase7 submit] pipeline invoke deferred", (err as Error)?.message ?? err);
    }
  }

  if (typeof console !== "undefined") {
    console.info("[fabric59 phase7 submit] interaction submitted", {
      queuedAt,
      interactionId,
      pipelineStatus,
      callId: payload.meta.callId,
    });
  }
  return { queuedAt, interactionId, pipelineStatus };
}

function appendToOutbox(queuedAt: string, payload: InteractionDraftPayload): void {
  try {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const list: Array<{ queuedAt: string; payload: InteractionDraftPayload }> = raw ? JSON.parse(raw) : [];
    list.push({ queuedAt, payload });
    const capped = list.slice(-50);
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(capped));
  } catch {
    /* non-fatal */
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`pipeline_invoke_timeout_${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Test/inspection helper — drain the outbox without consuming it. */
export function readPendingInteractions(): Array<{ queuedAt: string; payload: InteractionDraftPayload }> {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
