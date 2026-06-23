/**
 * Phase 9 — Fire a single telemetry event on first mount of the wrapped
 * subtree. Used to instrument tab views (Performance, Outcomes) without
 * polluting the host page with effects.
 */
import { useEffect, type ReactNode } from "react";
import {
  useCallsTelemetry,
  type CallsTelemetryEvent,
  type CallsTelemetryPayload,
} from "@/lib/workspace/telemetry/callsTelemetry";

export function TelemetryView({
  event,
  payload,
  children,
}: {
  event: CallsTelemetryEvent;
  payload?: CallsTelemetryPayload;
  children: ReactNode;
}) {
  const track = useCallsTelemetry();
  useEffect(() => {
    track(event, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return <>{children}</>;
}
