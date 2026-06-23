/**
 * Phase 7B — Client helper for the append-only `call_assist_events` log.
 *
 * Single entry point used by the cockpit Assist rail when an agent
 * accepts/copies a suggestion. The log is then picked up by the snapshot
 * builder and surfaced into `snapshot.ai_assist.used_suggestions`.
 *
 * Append-only is enforced at the DB level (triggers reject UPDATE/DELETE),
 * so callers only ever need to insert.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LogAssistSuggestionUsedInput {
  callSessionId: string;
  workspaceId: string;
  suggestionId: string;
  sourceType: string | null;
  sourcePrecedence: number | null;
  action: "accepted" | "copied" | "ignored";
  metadata?: Record<string, unknown>;
}

export async function logAssistSuggestionUsed(
  input: LogAssistSuggestionUsedInput,
): Promise<void> {
  try {
    const { error } = await supabase
      .from("call_assist_events" as never)
      .insert({
        call_session_id: input.callSessionId,
        workspace_id: input.workspaceId,
        event_type: "suggestion_used",
        suggestion_id: input.suggestionId,
        source_type: input.sourceType,
        source_precedence:
          typeof input.sourcePrecedence === "number" &&
          Number.isFinite(input.sourcePrecedence)
            ? input.sourcePrecedence
            : null,
        action: input.action,
        metadata: input.metadata ?? {},
      } as never);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[assist-events] insert failed", error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[assist-events] threw", e);
  }
}
