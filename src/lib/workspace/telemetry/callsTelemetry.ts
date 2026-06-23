/**
 * Phase 9 — Calls OS telemetry.
 *
 * Thin wrapper over the existing `platform_events` path (see
 * `useEmitEvent` in `usePlatformEvents`). No new schema. Every event carries:
 *   - workspace_id (from current WorkspaceContext)
 *   - campaign_id, call_session_id (when applicable)
 *   - source: "runs" | "qa" | "cockpit" | "campaign" | "analytics"
 *
 * Usage:
 *   const track = useCallsTelemetry();
 *   track("calls.replay.opened", { call_session_id, source: "qa" });
 *
 * Failures are best-effort — telemetry must never break the UX, so we
 * swallow mutation errors silently.
 */
import { useCallback } from "react";
import { useEmitEvent } from "@/hooks/usePlatformEvents";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type CallsTelemetrySource =
  | "runs"
  | "qa"
  | "cockpit"
  | "campaign"
  | "analytics";

export type CallsTelemetryEvent =
  | "calls.assist.suggestion_shown"
  | "calls.assist.suggestion_used"
  | "calls.replay.opened"
  | "calls.replay.closed"
  | "calls.qa.review_created"
  | "calls.qa.review_updated"
  | "calls.performance.viewed"
  | "calls.campaign_outcomes.viewed"
  | "calls.coaching.item_opened";

export interface CallsTelemetryPayload {
  campaign_id?: string | null;
  call_session_id?: string | null;
  source?: CallsTelemetrySource;
  [k: string]: unknown;
}

export type CallsTelemetryFn = (
  event: CallsTelemetryEvent,
  payload?: CallsTelemetryPayload,
) => void;

export function useCallsTelemetry(): CallsTelemetryFn {
  const emit = useEmitEvent();
  const { workspace } = useWorkspace();
  return useCallback<CallsTelemetryFn>(
    (event, payload = {}) => {
      if (!workspace) return;
      const source = payload.source ? `calls:${payload.source}` : "calls";
      try {
        emit.mutate(
          {
            event_type: event,
            source,
            payload: { workspace_id: workspace.id, ...payload },
          },
          {
            onError: () => {
              /* swallow — telemetry is best-effort */
            },
          },
        );
      } catch {
        /* noop */
      }
    },
    [emit, workspace],
  );
}
