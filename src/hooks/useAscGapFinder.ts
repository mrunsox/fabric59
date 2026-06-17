/**
 * ASC Slice 4 — Gap-finder hook.
 *
 * Advisory-only. Calls `asc-orchestrate` with role="gap-finder" and step
 * in {3, 4}. On success dispatches APPLY_GAP_FINDER_RESULT. Failures never
 * mutate the draft. Explicit-trigger only.
 */
import { useCallback, useState } from "react";
import type { Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AscAction, AscGapFinderStep } from "@/lib/asc/actions";
import type { AscDraft } from "@/lib/asc/types";
import { parseGapFinderResponse } from "@/lib/asc/gapFinderSchema";

export type AscGapFinderStatus = "idle" | "loading" | "ready" | "error";
export type AscGapFinderErrorCode =
  | "schema_invalid"
  | "rate_limited"
  | "credits_exhausted"
  | "upstream_error"
  | "network_error";

export interface AscGapFinderError {
  code: AscGapFinderErrorCode;
  message: string;
}

export interface UseAscGapFinderResult {
  status: AscGapFinderStatus;
  error: AscGapFinderError | null;
  runGapCheck: () => Promise<void>;
}

export function useAscGapFinder(params: {
  draft: AscDraft;
  step: AscGapFinderStep;
  dispatch: Dispatch<AscAction>;
}): UseAscGapFinderResult {
  const { draft, step, dispatch } = params;
  const [status, setStatus] = useState<AscGapFinderStatus>("idle");
  const [error, setError] = useState<AscGapFinderError | null>(null);

  const runGapCheck = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const snapshot = {
      business: draft.input.business,
      purpose: draft.input.purpose,
      callerReasons: draft.input.callerReasons,
    };
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "asc-orchestrate",
        {
          body: {
            role: "gap-finder",
            step,
            workspaceId: draft.workspaceId,
            skinId: draft.meta.skinId,
            draftInputSnapshot: snapshot,
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
        code?: AscGapFinderErrorCode;
        message?: string;
        response?: unknown;
      };
      if (!payload.ok) {
        setStatus("error");
        setError({
          code: (payload.code ?? "upstream_error") as AscGapFinderErrorCode,
          message: payload.message ?? "Gap-finder error",
        });
        return;
      }
      const parsed = parseGapFinderResponse(payload.response);
      if (!parsed || parsed.step !== step) {
        setStatus("error");
        setError({
          code: "schema_invalid",
          message: "Gap-finder response did not match the expected shape.",
        });
        return;
      }
      dispatch({
        type: "APPLY_GAP_FINDER_RESULT",
        step,
        items: parsed.items,
        now: new Date().toISOString(),
      });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError({
        code: "network_error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [draft, step, dispatch]);

  return { status, error, runGapCheck };
}
