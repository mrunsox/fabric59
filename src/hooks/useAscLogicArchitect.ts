/**
 * ASC Slice 5 — Logic Architect hook.
 *
 * Explicit-trigger only. Sends the current draft snapshot + grounding to
 * asc-orchestrate (role="logic-architect"). The hook filters non-grounded
 * Step 6/7 proposals into advisories BEFORE dispatch so they can never
 * become confirmable, per scope guards.
 */
import { useCallback, useState } from "react";
import type { Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AscAction } from "@/lib/asc/actions";
import type { AscDraft, AscLogicArchitectProposal } from "@/lib/asc/types";
import {
  parseLogicArchitectResponse,
  snapshotForLaProposal,
  type AscLaAdvisory,
  type AscLaNotificationValue,
  type AscLaStep,
} from "@/lib/asc/logicArchitectSchema";
import { emitAscEvent, type AscEventErrorCode } from "@/lib/asc/telemetry";

function mapLaErr(code: string | undefined): AscEventErrorCode {
  if (code === "credits_exhausted") return "402";
  if (code === "rate_limited") return "429";
  if (code === "schema_invalid") return "schema";
  if (code === "network_error") return "network";
  return "unknown";
}

export type AscLaStatus = "idle" | "loading" | "ready" | "error";
export type AscLaErrorCode =
  | "schema_invalid"
  | "rate_limited"
  | "credits_exhausted"
  | "upstream_error"
  | "network_error";

export interface AscLaError {
  code: AscLaErrorCode;
  message: string;
}

export interface AscLaGrounding {
  /** Step 5 — outcome labels already in the workspace catalog. */
  workspaceOutcomeCatalog?: string[];
  /** Step 6 — { channelRef, label, audienceRefs? } the workspace can actually use. */
  workspaceNotificationDestinations?: Array<{
    channelRef: string;
    label: string;
    audienceRefs?: string[];
  }>;
  /** Step 7 — destination context the wizard knows about. Empty arrays
   *  mean "no external destinations are configured" → AI must not invent. */
  destinationContext?: {
    allowInternalRunner: boolean;
    configuredExternalUrls: string[];
    configuredDeepLinkTemplates: string[];
  };
  /** Step 7 — slugs already taken in the workspace (case-insensitive). */
  takenSlugs?: string[];
}

export interface UseAscLogicArchitectResult {
  status: AscLaStatus;
  error: AscLaError | null;
  runArchitect: () => Promise<void>;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `la-${crypto.randomUUID()}`;
  }
  return `la-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAscLogicArchitect(params: {
  draft: AscDraft;
  step: AscLaStep;
  dispatch: Dispatch<AscAction>;
  grounding?: AscLaGrounding;
}): UseAscLogicArchitectResult {
  const { draft, step, dispatch, grounding } = params;
  const [status, setStatus] = useState<AscLaStatus>("idle");
  const [error, setError] = useState<AscLaError | null>(null);

  const runArchitect = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const emitOutcome = (outcome: "ok" | "fail", errorCode?: AscEventErrorCode) =>
      emitAscEvent("asc_ai_call", {
        ascDraftId: draft.id,
        workspaceId: draft.workspaceId,
        step,
        role: "logic_architect",
        outcome,
        errorCode,
      });
    const snapshot = {
      business: draft.input.business,
      purpose: draft.input.purpose,
      callerReasons: draft.input.callerReasons,
      outcomesDraftEdits: draft.input.outcomesDraftEdits ?? [],
      notificationsDraftEdits: draft.input.notificationsDraftEdits ?? [],
      destination: draft.input.destination ?? null,
      launch: draft.input.launch ?? null,
    };
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "asc-orchestrate",
        {
          body: {
            role: "logic-architect",
            step,
            workspaceId: draft.workspaceId,
            skinId: draft.meta.skinId,
            draftInputSnapshot: snapshot,
            grounding: grounding ?? {},
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
        code?: AscLaErrorCode;
        message?: string;
        response?: unknown;
      };
      if (!payload.ok) {
        setStatus("error");
        setError({
          code: (payload.code ?? "upstream_error") as AscLaErrorCode,
          message: payload.message ?? "Logic Architect error",
        });
        emitOutcome("fail", mapLaErr(payload.code));
        return;
      }
      const parsed = parseLogicArchitectResponse(payload.response);
      if (!parsed || parsed.step !== step) {
        setStatus("error");
        setError({
          code: "schema_invalid",
          message: "Logic Architect response did not match the expected shape.",
        });
        emitOutcome("fail", "schema");
        return;
      }

      // ── Grounding filter (scope guard) ────────────────────────────────
      const passThroughProposals: typeof parsed.proposals = [];
      const extraAdvisories: AscLaAdvisory[] = [...parsed.advisories];

      const knownChannels = new Set(
        (grounding?.workspaceNotificationDestinations ?? []).map((d) =>
          d.channelRef.trim().toLowerCase(),
        ),
      );
      const knownExternalUrls = new Set(
        (grounding?.destinationContext?.configuredExternalUrls ?? []).map((u) =>
          u.trim().toLowerCase(),
        ),
      );
      const knownDeepLinks = new Set(
        (grounding?.destinationContext?.configuredDeepLinkTemplates ?? []).map(
          (u) => u.trim().toLowerCase(),
        ),
      );

      for (const p of parsed.proposals) {
        if (step === 6 && p.targetField === "notifications.add") {
          if (knownChannels.size === 0) {
            extraAdvisories.push({
              message:
                "Connect a notification destination to enable confirmable rule suggestions.",
            });
            continue;
          }
          const v = p.value as AscLaNotificationValue;
          if (!knownChannels.has(v.channelRef.trim().toLowerCase())) {
            extraAdvisories.push({
              message: `Suggested rule referenced unknown channel "${v.channelRef}". Connect it first.`,
            });
            continue;
          }
        }
        if (step === 7) {
          if (
            p.targetField === "destination.externalUrl" &&
            !knownExternalUrls.has(String(p.value).trim().toLowerCase())
          ) {
            extraAdvisories.push({
              message: `Suggested external URL "${p.value}" isn't configured in this workspace.`,
            });
            continue;
          }
          if (
            p.targetField === "destination.deepLinkTemplate" &&
            knownDeepLinks.size > 0 &&
            !knownDeepLinks.has(String(p.value).trim().toLowerCase())
          ) {
            extraAdvisories.push({
              message: `Suggested deep-link template "${p.value}" isn't configured.`,
            });
            continue;
          }
        }
        passThroughProposals.push(p);
      }

      const proposals: AscLogicArchitectProposal[] = passThroughProposals.map(
        (p) => ({
          id: makeId(),
          step,
          targetField: p.targetField,
          value: p.value,
          confidence: p.confidence,
          rationale: p.rationale,
          status: "pending",
          fieldSnapshot: snapshotForLaProposal(draft.input, p.targetField),
          issuedAt: new Date().toISOString(),
        }),
      );

      dispatch({
        type: "APPLY_LOGIC_ARCHITECT_RESULT",
        step,
        proposals,
        advisories: extraAdvisories,
        now: new Date().toISOString(),
      });
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
  }, [draft, step, dispatch, grounding]);

  return { status, error, runArchitect };
}
