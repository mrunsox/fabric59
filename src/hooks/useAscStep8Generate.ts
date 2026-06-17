/**
 * ASC Slice 6 — Step 8 generation hook.
 *
 * Explicit-trigger only. Sends the current draft + grounding to
 * asc-orchestrate (role="logic-architect-compile", step=8). Parses + normalizes
 * the response client-side, then dispatches BEGIN/APPLY/FAIL.
 *
 * Manual Steps 1–7 inputs remain the source of truth. The hook never mutates
 * `draft.input`. On failure, the existing `draft.generated` (if any) is
 * preserved by the reducer and a recoverable error is surfaced.
 */
import { useCallback } from "react";
import type { Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AscAction } from "@/lib/asc/actions";
import type {
  AscDraft,
  AscGenerationError,
  AscGenerationErrorCode,
} from "@/lib/asc/types";
import {
  normalizeStep8Compile,
  parseStep8CompileResponse,
  type NormalizeStep8Options,
} from "@/lib/asc/step8CompileSchema";
import { normalizeOutcomeLabel } from "@/lib/asc/logicArchitectSchema";
import type { AscLaGrounding } from "@/hooks/useAscLogicArchitect";

export interface UseAscStep8GenerateParams {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
  grounding?: AscLaGrounding;
}

export interface UseAscStep8GenerateResult {
  runGenerate: () => Promise<void>;
}

export function useAscStep8Generate(
  params: UseAscStep8GenerateParams,
): UseAscStep8GenerateResult {
  const { draft, dispatch, grounding } = params;

  const runGenerate = useCallback(async () => {
    const now = new Date().toISOString();
    dispatch({ type: "BEGIN_STEP8_GENERATION", now });

    const snapshot = {
      business: draft.input.business,
      purpose: draft.input.purpose,
      callerReasons: draft.input.callerReasons,
      outcomesDraftEdits: draft.input.outcomesDraftEdits ?? [],
      notificationsDraftEdits: draft.input.notificationsDraftEdits ?? [],
      destination: draft.input.destination ?? null,
      launch: draft.input.launch ?? null,
    };

    const fail = (code: AscGenerationErrorCode, message: string): void => {
      const error: AscGenerationError = { code, message };
      dispatch({
        type: "FAIL_STEP8_GENERATION",
        now: new Date().toISOString(),
        error,
      });
    };

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "asc-orchestrate",
        {
          body: {
            role: "logic-architect-compile",
            step: 8,
            workspaceId: draft.workspaceId,
            skinId: draft.meta.skinId,
            draftInputSnapshot: snapshot,
            grounding: grounding ?? {},
          },
        },
      );

      if (invokeError) {
        fail("network_error", invokeError.message ?? "Network error");
        return;
      }

      const payload = (data ?? {}) as {
        ok?: boolean;
        code?: AscGenerationErrorCode;
        message?: string;
        response?: unknown;
      };
      if (!payload.ok) {
        fail(
          (payload.code ?? "upstream_error") as AscGenerationErrorCode,
          payload.message ?? "Step 8 generation failed.",
        );
        return;
      }

      const parsed = parseStep8CompileResponse(payload.response);
      if (!parsed) {
        fail("schema_invalid", "Step 8 response did not match the expected shape.");
        return;
      }

      const opts: NormalizeStep8Options = {
        knownReasonIds: new Set(draft.input.callerReasons.map((r) => r.id)),
        knownOutcomeRefs: new Set(
          (draft.input.outcomesDraftEdits ?? []).map((o) =>
            normalizeOutcomeLabel(o.label),
          ),
        ),
        knownChannelRefs: new Set(
          (grounding?.workspaceNotificationDestinations ?? []).map((d) =>
            d.channelRef.trim().toLowerCase(),
          ),
        ),
        knownExternalUrls: new Set(
          (grounding?.destinationContext?.configuredExternalUrls ?? []).map((u) =>
            u.trim().toLowerCase(),
          ),
        ),
        knownDeepLinkTemplates: new Set(
          (grounding?.destinationContext?.configuredDeepLinkTemplates ?? []).map(
            (u) => u.trim().toLowerCase(),
          ),
        ),
        step7Slug: draft.input.launch?.slug,
      };

      const nowIso = new Date().toISOString();
      const result = normalizeStep8Compile(parsed, draft.input, opts, nowIso);
      if (result.fatal) {
        fail(result.fatal.code, result.fatal.message);
        return;
      }

      dispatch({
        type: "APPLY_STEP8_GENERATION",
        generated: result.generated,
        advisories: result.advisories,
        now: nowIso,
      });
    } catch (err) {
      fail(
        "network_error",
        err instanceof Error ? err.message : "Network error",
      );
    }
  }, [draft, dispatch, grounding]);

  return { runGenerate };
}
