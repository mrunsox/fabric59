/**
 * ASC Slice 3 — Interviewer hook.
 *
 * Owns the call to `asc-orchestrate`, schema re-validation, snapshot
 * capture for the manual-wins-over-stale rule, and the recoverable error
 * state. Reducer is the single source of truth for the draft; this hook
 * only dispatches typed actions.
 *
 * Per Slice 3 scope locks:
 *   - askNext() runs only on explicit user action (or after confirm/reject).
 *     No blur, focus, or mount triggers.
 *   - role is hard-pinned to "interviewer"; steps 1 and 2 only.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AscAction } from "@/lib/asc/actions";
import type {
  AscDraft,
  AscInterviewerProposal,
  AscInterviewerTurn,
} from "@/lib/asc/types";
import {
  parseInterviewerResponse,
  readTargetFieldValue,
  serializeFieldValue,
  type AscInterviewerResponse,
} from "@/lib/asc/interviewerSchema";

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
  /** Consecutive schema-invalid count for the current step. UI uses this
   *  to surface the "switch to manual" affordance after persistent failure. */
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
    fieldSnapshot: serializeFieldValue(
      readTargetFieldValue(draft.input, p.targetField),
    ),
    issuedAt: now,
  }));
  return {
    questionId: resp.nextQuestion?.id ?? null,
    questionPrompt: resp.nextQuestion?.prompt ?? null,
    questionTargetField: resp.nextQuestion?.targetField ?? null,
    questionInputKind: resp.nextQuestion?.inputKind ?? null,
    questionOptions: resp.nextQuestion?.options,
    proposals,
    askedAt: now,
  };
}

export function useAscInterviewer(params: {
  draft: AscDraft;
  step: 1 | 2;
  dispatch: Dispatch<AscAction>;
}): UseAscInterviewerResult {
  const { draft, step, dispatch } = params;
  const [status, setStatus] = useState<AscInterviewerStatus>("idle");
  const [error, setError] = useState<AscInterviewerError | null>(null);
  const failuresRef = useRef<Record<1 | 2, number>>({ 1: 0, 2: 0 });
  const [, force] = useState(0);

  const askNext = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const snapshot = {
      business: draft.input.business,
      purpose: draft.input.purpose,
    };
    const confirmedFields = draft.meta.interviewer?.confirmedFields ?? [];
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
        return;
      }
      // Success — reset failure counter, dispatch the turn.
      failuresRef.current[step] = 0;
      const turn = buildTurnFromResponse(
        parsed,
        draft,
        new Date().toISOString(),
      );
      dispatch({ type: "APPLY_INTERVIEWER_TURN", step, turn });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError({
        code: "network_error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [draft, step, dispatch]);

  const confirm = useCallback(
    (proposalId: string) => {
      dispatch({ type: "CONFIRM_PROPOSED_FIELD", step, proposalId });
    },
    [dispatch, step],
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
