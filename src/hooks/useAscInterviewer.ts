/**
 * ASC Slice 3/4 — Interviewer hook.
 *
 * Owns the call to `asc-orchestrate`, schema re-validation, snapshot
 * capture for the manual-wins-over-stale rule, and the recoverable error
 * state. Reducer is the single source of truth for the draft; this hook
 * only dispatches typed actions.
 *
 * Per scope locks:
 *   - askNext() runs only on explicit user action (or after confirm/reject).
 *     No blur, focus, or mount triggers.
 *   - role is hard-pinned to "interviewer"; steps 1..4 only (Slice 4).
 *   - Per-reason proposals carry reasonId; snapshot is the serialized slot
 *     for that specific reason. `callerReasons.add` snapshot is the
 *     normalized existing-label set (duplicate guard lives in the reducer).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AscAction, AscInterviewerStep } from "@/lib/asc/actions";
import type {
  AscDraft,
  AscInterviewerProposal,
  AscInterviewerTurn,
} from "@/lib/asc/types";
import {
  parseInterviewerResponse,
  readPerReasonFieldValue,
  readTargetFieldValue,
  serializeFieldValue,
  snapshotCallerReasonsLabels,
  targetFieldSlot,
  type AscInterviewerResponse,
} from "@/lib/asc/interviewerSchema";
import { emitAscEvent, type AscEventErrorCode } from "@/lib/asc/telemetry";

function mapErrorCode(code: string | undefined): AscEventErrorCode {
  if (code === "credits_exhausted") return "402";
  if (code === "rate_limited") return "429";
  if (code === "schema_invalid") return "schema";
  if (code === "network_error") return "network";
  return "unknown";
}

export type AscInterviewerStatus = "idle" | "loading" | "ready" | "error";

export type AscInterviewerErrorCode =
  | "schema_invalid"
  | "rate_limited"
  | "credits_exhausted"
  | "upstream_error"
  | "network_error";

export interface AscInterviewerError {
  code: AscInterviewerErrorCode;
  message: string;
}

export interface UseAscInterviewerResult {
  status: AscInterviewerStatus;
  error: AscInterviewerError | null;
  consecutiveSchemaFailures: number;
  askNext: () => Promise<void>;
  confirm: (proposalId: string) => void;
  reject: (proposalId: string) => void;
  dismiss: () => void;
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function snapshotForProposal(
  draft: AscDraft,
  payload: AscInterviewerResponse["proposedFields"][number],
): string {
  const slot = targetFieldSlot(payload.targetField);
  if (slot === "callerReasons") {
    return snapshotCallerReasonsLabels(draft.input);
  }
  if (slot === "callerReason") {
    if (payload.targetField === "callerReason.branching.add") {
      // Append-only — snapshot is unused but keep stable.
      return "";
    }
    const reason = draft.input.callerReasons.find(
      (r) => r.id === payload.reasonId,
    );
    return serializeFieldValue(
      readPerReasonFieldValue(reason, payload.targetField),
    );
  }
  return serializeFieldValue(
    readTargetFieldValue(draft.input, payload.targetField),
  );
}

function buildTurnFromResponse(
  resp: AscInterviewerResponse,
  draft: AscDraft,
  now: string,
): AscInterviewerTurn {
  const proposals: AscInterviewerProposal[] = resp.proposedFields.map((p) => ({
    id: makeId("prop"),
    targetField: p.targetField,
    value: p.value,
    confidence: p.confidence,
    rationale: p.rationale,
    status: "pending",
    fieldSnapshot: snapshotForProposal(draft, p),
    issuedAt: now,
    reasonId: p.reasonId,
  }));
  return {
    questionId: resp.nextQuestion?.id ?? null,
    questionPrompt: resp.nextQuestion?.prompt ?? null,
    questionTargetField: resp.nextQuestion?.targetField ?? null,
    questionInputKind: resp.nextQuestion?.inputKind ?? null,
    questionOptions: resp.nextQuestion?.options,
    questionReasonId: resp.nextQuestion?.reasonId,
    proposals,
    askedAt: now,
  };
}

export function useAscInterviewer(params: {
  draft: AscDraft;
  step: AscInterviewerStep;
  dispatch: Dispatch<AscAction>;
}): UseAscInterviewerResult {
  const { draft, step, dispatch } = params;
  const [status, setStatus] = useState<AscInterviewerStatus>("idle");
  const [error, setError] = useState<AscInterviewerError | null>(null);
  const failuresRef = useRef<Record<AscInterviewerStep, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const [, force] = useState(0);

  const askNext = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const snapshot = {
      business: draft.input.business,
      purpose: draft.input.purpose,
      callerReasons: draft.input.callerReasons,
    };
    const confirmedFields = draft.meta.interviewer?.confirmedFields ?? [];
    const emitOutcome = (outcome: "ok" | "fail", errorCode?: AscEventErrorCode) =>
      emitAscEvent("asc_ai_call", {
        ascDraftId: draft.id,
        workspaceId: draft.workspaceId,
        step,
        role: "interviewer",
        outcome,
        errorCode,
      });
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "asc-orchestrate",
        {
          body: {
            role: "interviewer",
            step,
            workspaceId: draft.workspaceId,
            skinId: draft.meta.skinId,
            draftInputSnapshot: snapshot,
            confirmedFields,
          },
        },
      );
      if (invokeError) {
        setStatus("error");
        setError({
          code: "network_error",
          message: invokeError.message ?? "Network error",
        });
        emitOutcome("fail", "network");
        return;
      }
      const payload = (data ?? {}) as {
        ok?: boolean;
        code?: AscInterviewerErrorCode;
        message?: string;
        response?: unknown;
      };
      if (!payload.ok) {
        setStatus("error");
        const code = (payload.code ?? "upstream_error") as AscInterviewerErrorCode;
        if (code === "schema_invalid") {
          failuresRef.current[step] = (failuresRef.current[step] ?? 0) + 1;
          force((n) => n + 1);
        }
        setError({ code, message: payload.message ?? "Assistant error" });
        emitOutcome("fail", mapErrorCode(code));
        return;
      }
      const parsed = parseInterviewerResponse(payload.response);
      if (!parsed || parsed.step !== step) {
        failuresRef.current[step] = (failuresRef.current[step] ?? 0) + 1;
        force((n) => n + 1);
        setStatus("error");
        setError({
          code: "schema_invalid",
          message: "Assistant response did not match the expected shape.",
        });
        emitOutcome("fail", "schema");
        return;
      }
      failuresRef.current[step] = 0;
      const turn = buildTurnFromResponse(
        parsed,
        draft,
        new Date().toISOString(),
      );
      dispatch({ type: "APPLY_INTERVIEWER_TURN", step, turn });
      setStatus("ready");
      emitOutcome("ok");
    } catch (err) {
      setStatus("error");
      setError({
        code: "network_error",
        message: err instanceof Error ? err.message : "Network error",
      });
      emitOutcome("fail", "network");
    }
  }, [draft, step, dispatch]);

  const confirm = useCallback(
    (proposalId: string) => {
      const lastTurn = draft.meta.interviewer?.lastTurnByStep?.[step];
      const targetField = lastTurn?.proposals?.find((p) => p.id === proposalId)
        ?.targetField;
      emitAscEvent("asc_ai_proposal_confirmed", {
        ascDraftId: draft.id,
        workspaceId: draft.workspaceId,
        step,
        role: "interviewer",
        targetField,
      });
      dispatch({ type: "CONFIRM_PROPOSED_FIELD", step, proposalId });
    },
    [dispatch, step, draft.id, draft.workspaceId, draft.meta.interviewer],
  );

  const reject = useCallback(
    (proposalId: string) => {
      dispatch({ type: "REJECT_PROPOSED_FIELD", step, proposalId });
    },
    [dispatch, step],
  );

  const dismiss = useCallback(() => {
    dispatch({ type: "CLEAR_INTERVIEWER_STEP", step });
    setStatus("idle");
    setError(null);
  }, [dispatch, step]);

  const result = useMemo<UseAscInterviewerResult>(
    () => ({
      status,
      error,
      consecutiveSchemaFailures: failuresRef.current[step] ?? 0,
      askNext,
      confirm,
      reject,
      dismiss,
    }),
    [status, error, step, askNext, confirm, reject, dismiss],
  );

  return result;
}
