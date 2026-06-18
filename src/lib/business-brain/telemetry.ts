/**
 * Business Brain telemetry — mirrors the ASC pattern.
 *
 * Fire-and-forget inserts into `platform_events` with `bb_*` event types and
 * source = "business-brain". Failures are swallowed. Never blocks UX.
 */
import { supabase } from "@/integrations/supabase/client";

export const BB_EVENT_TYPES = [
  "bb_source_added",
  "bb_source_processed",
  "bb_source_failed",
  "bb_extraction_completed",
  "bb_fact_approved",
  "bb_fact_rejected",
  "bb_fact_edited",
  "bb_fact_merged",
  // Phase 2 — ASC advisory integration
  "bb_asc_suggestions_loaded",
  "bb_asc_suggestion_used",
  "bb_asc_suggestion_dismissed",
  "bb_asc_suggestion_hidden_forked",
  // Phase 3 — retrieval & internal search
  "bb_search_query_submitted",
  "bb_search_result_opened",
  "bb_search_result_marked",
  "bb_search_reindex_started",
  "bb_embed_run_completed",
  // Phase 4 — Live runner assist
  "bb_assist_panel_shown",
  "bb_assist_card_opened",
  "bb_assist_card_copied",
  "bb_assist_card_inserted",
  "bb_assist_refresh_triggered",
  "bb_assist_no_results",
  // Phase 5 — Governance loop
  "bb_fact_marked_reviewed",
  "bb_fact_marked_needs_update",
  "bb_conflict_resolved",
  "bb_governance_view_opened",
] as const;
export type BbEventType = (typeof BB_EVENT_TYPES)[number];

export interface BbEventPayload {
  workspaceId?: string | null;
  organizationId?: string | null;
  sourceId?: string;
  extractionId?: string;
  factId?: string;
  entityType?: string;
  outcome?: "ok" | "fail";
  errorCode?: string;
  count?: number;
  // Phase 2
  ascDraftId?: string;
  step?: number;
  // Phase 3 — structural metadata only. Never raw query/snippet text.
  queryLength?: number;
  filterCount?: number;
  resultCount?: number;
  factCount?: number;
  chunkCount?: number;
  latencyMs?: number;
  hitKind?: "fact" | "chunk";
  rank?: number;
  useful?: boolean;
  embedTarget?: "facts" | "chunks" | "both";
  embedded?: number;
  failed?: number;
  // Phase 4 — Live runner assist (structure only; never raw text)
  campaignId?: string;
  stepKind?: string;
  cardKind?: string;
  cardCount?: number;
  reason?: string;
  // Phase 5 — Governance (ids + structural only; never raw text/payloads)
  conflictId?: string;
  conflictKind?: string;
  resolution?: "supersede" | "keep_both" | "dismiss";
  staleStateBefore?: string;
  staleStateAfter?: string;
  section?: "stale" | "conflicts";
  filtersApplied?: number;
}

const ALLOWED: ReadonlySet<keyof BbEventPayload> = new Set([
  "workspaceId",
  "organizationId",
  "sourceId",
  "extractionId",
  "factId",
  "entityType",
  "outcome",
  "errorCode",
  "count",
  "ascDraftId",
  "step",
  "queryLength",
  "filterCount",
  "resultCount",
  "factCount",
  "chunkCount",
  "latencyMs",
  "hitKind",
  "rank",
  "useful",
  "embedTarget",
  "embedded",
  "failed",
  "campaignId",
  "stepKind",
  "cardKind",
  "cardCount",
  "reason",
  "conflictId",
  "conflictKind",
  "resolution",
  "staleStateBefore",
  "staleStateAfter",
  "section",
  "filtersApplied",
]);

function sanitize(p: BbEventPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(p) as Array<keyof BbEventPayload>) {
    if (!ALLOWED.has(k)) continue;
    const v = p[k];
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

type Emitter = (
  eventType: BbEventType,
  payload: Record<string, unknown>,
  organizationId: string | null,
) => Promise<void> | void;

const defaultEmitter: Emitter = async (eventType, payload, organizationId) => {
  if (!organizationId) return;
  try {
    await supabase.from("platform_events").insert([
      {
        organization_id: organizationId,
        event_type: eventType,
        payload: payload as never,
        source: "business-brain",
      },
    ]);
  } catch {
    /* swallow */
  }
};

let emitter: Emitter = defaultEmitter;

export function __setBbTelemetryEmitter(next: Emitter | null): void {
  emitter = next ?? defaultEmitter;
}

export function emitBbEvent(
  eventType: BbEventType,
  payload: BbEventPayload = {},
): void {
  try {
    if (!(BB_EVENT_TYPES as readonly string[]).includes(eventType)) {
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[bb-telemetry] unknown event type rejected:", eventType);
      }
      return;
    }
    const clean = sanitize(payload);
    const orgId = payload.organizationId ?? null;
    const result = emitter(eventType, clean, orgId);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {
        /* swallow */
      });
    }
  } catch (err) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[bb-telemetry] emit failed:", err);
    }
  }
}
