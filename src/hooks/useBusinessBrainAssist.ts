/**
 * Business Brain — Live Runner assist hook (Phase 4).
 *
 * Read-only. Builds an AssistSessionContext from the live runner state,
 * fetches approved facts via the bridge selector, ranks them, and returns a
 * small list (0–5) of assist cards. Manual `refresh()` is provided.
 *
 * Disabled by default; only active when:
 *   - the BB feature flag is on
 *   - there is a workspace id
 *   - the runner is not in read-only mode
 *
 * Never writes to ASC, canonical, or runner state. The panel surface is the
 * only consumer.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryClientContext, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessBrainFlag } from "@/lib/business-brain/flagResolver";
import { getAssistFactsForSession } from "@/lib/business-brain/selectors";
import { buildAssistContext, type AssistSessionContext } from "@/lib/business-brain/assistContext";
import { rankAssistCards, type BbAssistCard } from "@/lib/business-brain/assistRanker";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import type { CallSessionMeta, CallSessionState } from "@/types/call-runner";
import type { CampaignFlowContent } from "@/types/campaign-flow";

export interface UseBusinessBrainAssistInput {
  meta: CallSessionMeta;
  session: CallSessionState;
  flow: CampaignFlowContent | null;
  /** Resolved tenant/client id (optional). */
  clientId?: string | null;
  /** Forces panel off (e.g. preview / read-only mode). */
  isReadOnly?: boolean;
}

export interface UseBusinessBrainAssistResult {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  context: AssistSessionContext | null;
  cards: BbAssistCard[];
  isEmpty: boolean;
  refresh: () => void;
  lastRefreshedAt: string | null;
}

export function useBusinessBrainAssist(
  input: UseBusinessBrainAssistInput,
): UseBusinessBrainAssistResult {
  let flagEnabled = false;
  let organizationId: string | null = null;
  try {
    flagEnabled = useBusinessBrainFlag().enabled;
    organizationId = useAuth().organization?.id ?? null;
  } catch {
    flagEnabled = false;
    organizationId = null;
  }
  const hasQueryClient = Boolean(useContext(QueryClientContext));
  const enabled =
    hasQueryClient &&
    flagEnabled &&
    Boolean(input.meta.workspaceId) &&
    !input.isReadOnly;

  const context = useMemo<AssistSessionContext | null>(() => {
    if (!enabled) return null;
    return buildAssistContext({
      meta: input.meta,
      session: input.session,
      flow: input.flow,
      clientId: input.clientId ?? null,
    });
  }, [enabled, input.meta, input.session, input.flow, input.clientId]);

  const factsQuery = useQuery({
    queryKey: ["bb_assist_facts", input.meta.workspaceId, input.clientId ?? null],
    enabled,
    staleTime: 60_000,
    queryFn: () =>
      getAssistFactsForSession({
        workspaceId: input.meta.workspaceId,
        clientId: input.clientId ?? undefined,
        limit: 80,
      }),
  });

  const cards = useMemo<BbAssistCard[]>(() => {
    if (!enabled || !context) return [];
    const facts = factsQuery.data ?? [];
    return rankAssistCards(facts, context);
  }, [enabled, context, factsQuery.data]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    emitBbEvent("bb_assist_refresh_triggered", {
      workspaceId: input.meta.workspaceId,
      organizationId,
      campaignId: input.meta.campaignId,
      stepKind: context?.stepKind,
    });
    void factsQuery.refetch();
  }, [enabled, factsQuery, input.meta.workspaceId, input.meta.campaignId, organizationId, context?.stepKind]);

  // Telemetry: panel shown + no-results (debounced to step/cards changes).
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || factsQuery.isLoading || !context) return;
    const key = `${context.stepKind}:${cards.length}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    emitBbEvent("bb_assist_panel_shown", {
      workspaceId: input.meta.workspaceId,
      organizationId,
      campaignId: input.meta.campaignId,
      stepKind: context.stepKind,
      cardCount: cards.length,
    });
    if (cards.length === 0) {
      emitBbEvent("bb_assist_no_results", {
        workspaceId: input.meta.workspaceId,
        organizationId,
        campaignId: input.meta.campaignId,
        stepKind: context.stepKind,
        reason: context.hasContext ? "no_match" : "weak_context",
      });
    }
  }, [
    enabled,
    factsQuery.isLoading,
    context,
    cards.length,
    input.meta.workspaceId,
    input.meta.campaignId,
    organizationId,
  ]);

  const lastRefreshedAt = factsQuery.dataUpdatedAt
    ? new Date(factsQuery.dataUpdatedAt).toISOString()
    : null;

  return {
    enabled,
    isLoading: enabled && factsQuery.isLoading,
    isError: enabled && factsQuery.isError,
    context,
    cards,
    isEmpty: enabled && !factsQuery.isLoading && cards.length === 0,
    refresh,
    lastRefreshedAt,
  };
}
