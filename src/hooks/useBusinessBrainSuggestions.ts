/**
 * Business Brain → ASC suggestion hook (Phase 2).
 *
 * Read-only. Returns ranked suggestion cards for the given ASC step. Wiring
 * lives entirely behind `@/lib/business-brain/selectors` — this hook is the
 * only file in src/hooks that ASC may import from for Business Brain data.
 *
 * Emits `bb_asc_suggestions_loaded` once per (workspaceId, step, factCount).
 * `bb_asc_suggestion_hidden_forked` fires from the consuming component, not
 * here.
 */
import { useContext, useEffect, useMemo, useRef } from "react";
import { QueryClientContext, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessBrainFlag } from "@/lib/business-brain/flagResolver";
import {
  BB_STEP_ENTITY_TYPES,
  buildCallerReasonSuggestions,
  buildDestinationSuggestions,
  buildEscalationSuggestions,
  buildIntakeRequirementSuggestions,
  listApprovedFacts,
  type ApprovedFactView,
  type BbAscStep,
  type BbAscSuggestion,
} from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";

export interface UseBusinessBrainSuggestionsInput {
  workspaceId: string;
  step: number;
  /** ASC draft id; emitted in telemetry. */
  ascDraftId?: string | null;
  /** Post-fork / generated drafts disable the tray entirely. */
  isReadOnly?: boolean;
  /** Used by builders to dedupe + require apply targets. */
  existingCallerReasonLabels?: string[];
  hasCallerReason?: boolean;
  existingNotificationTriggers?: string[];
  hasDestination?: boolean;
}

export interface UseBusinessBrainSuggestionsResult {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  suggestions: BbAscSuggestion[];
}

const SUPPORTED_STEPS: ReadonlySet<number> = new Set([3, 4, 6, 7]);

export function useBusinessBrainSuggestions(
  input: UseBusinessBrainSuggestionsInput,
): UseBusinessBrainSuggestionsResult {
  const flag = useBusinessBrainFlag();
  const { organization } = useAuth();
  // Defensive: avoid hard crash in test/render contexts that don't mount a
  // QueryClientProvider. When absent, treat the hook as disabled — the BB
  // tray simply hides itself.
  const hasQueryClient = Boolean(useContext(QueryClientContext));
  const stepSupported = SUPPORTED_STEPS.has(input.step);
  const enabled =
    hasQueryClient &&
    Boolean(flag.enabled) &&
    Boolean(input.workspaceId) &&
    !input.isReadOnly &&
    stepSupported;

  const entityTypes = stepSupported
    ? BB_STEP_ENTITY_TYPES[input.step as BbAscStep]
    : [];

  const factsQuery = useQuery({
    queryKey: [
      "bb_asc_facts",
      input.workspaceId,
      input.step,
      entityTypes.join(","),
    ],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ApprovedFactView[]> => {
      return listApprovedFacts({
        workspaceId: input.workspaceId,
        entityType: entityTypes,
        limit: 100,
      });
    },
  });

  const suggestions = useMemo<BbAscSuggestion[]>(() => {
    if (!enabled) return [];
    const facts = factsQuery.data ?? [];
    const opts = {
      existingCallerReasonLabels: input.existingCallerReasonLabels,
      hasCallerReason: input.hasCallerReason,
      existingNotificationTriggers: input.existingNotificationTriggers,
      hasDestination: input.hasDestination,
    };
    switch (input.step) {
      case 3:
        return buildCallerReasonSuggestions(facts, opts);
      case 4:
        return buildIntakeRequirementSuggestions(facts, opts);
      case 6:
        return buildEscalationSuggestions(facts, opts);
      case 7:
        return buildDestinationSuggestions(facts, opts);
      default:
        return [];
    }
  }, [
    enabled,
    factsQuery.data,
    input.step,
    input.existingCallerReasonLabels,
    input.hasCallerReason,
    input.existingNotificationTriggers,
    input.hasDestination,
  ]);

  // Telemetry: emit once per (ascDraftId, step, count) tuple.
  const lastEmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || factsQuery.isLoading) return;
    const key = `${input.ascDraftId ?? ""}:${input.step}:${suggestions.length}`;
    if (lastEmittedRef.current === key) return;
    lastEmittedRef.current = key;
    emitBbEvent("bb_asc_suggestions_loaded", {
      workspaceId: input.workspaceId,
      organizationId: organization?.id ?? null,
      ascDraftId: input.ascDraftId ?? undefined,
      step: input.step,
      count: suggestions.length,
    });
  }, [
    enabled,
    factsQuery.isLoading,
    suggestions.length,
    input.ascDraftId,
    input.step,
    input.workspaceId,
    organization?.id,
  ]);

  return {
    enabled,
    isLoading: enabled && factsQuery.isLoading,
    isError: enabled && factsQuery.isError,
    suggestions,
  };
}
