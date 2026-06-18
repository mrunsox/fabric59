/**
 * Business Brain Phase 7 — Gap signal logging helper.
 *
 * Fire-and-forget inserts into `bb_gap_events` from the search UI, ASC
 * suggestion hook, and Live Assist hook. Never blocks UI. Raw query text is
 * stored but tightly restricted by RLS — the governance UI never reads it
 * directly.
 *
 * This module is intentionally tiny and dependency-free so it is safe to
 * import from ASC/runner code paths (logging-only, no governance surface
 * imports). The boundary test allows this single import.
 */
import { supabase } from "@/integrations/supabase/client";

export type GapChannel = "search" | "asc" | "assist";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export interface LogGapSignalInput {
  workspaceId: string;
  channel: GapChannel;
  rawQuery: string;
  clientId?: string | null;
  verticalProfileId?: string | null;
  context?: Record<string, unknown>;
}

export function logGapSignal(input: LogGapSignalInput): void {
  try {
    if (!input.workspaceId || !input.rawQuery) return;
    const raw = input.rawQuery.toString().slice(0, 1000);
    const normalized = normalize(raw);
    if (normalized.length < 3) return;
    void supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("bb_gap_events" as any)
      .insert({
        workspace_id: input.workspaceId,
        client_id: input.clientId ?? null,
        vertical_profile_id: input.verticalProfileId ?? null,
        channel: input.channel,
        raw_query: raw,
        normalized_query: normalized,
        context: input.context ?? {},
      })
      .then(() => {
        /* swallow */
      });
  } catch {
    /* swallow */
  }
}
