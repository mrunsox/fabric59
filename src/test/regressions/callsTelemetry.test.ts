/**
 * Phase 9 — Calls OS telemetry wiring.
 *
 * Verifies the `useCallsTelemetry` hook routes events through `useEmitEvent`
 * with the right event_type/source/payload shape (workspace_id injected).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mutateSpy = vi.fn();
vi.mock("@/hooks/usePlatformEvents", () => ({
  useEmitEvent: () => ({ mutate: mutateSpy }),
}));
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: { id: "ws-1", organization_id: "org-1" } }),
}));

import { useCallsTelemetry } from "@/lib/workspace/telemetry/callsTelemetry";

beforeEach(() => mutateSpy.mockClear());

describe("useCallsTelemetry", () => {
  it("injects workspace_id and source label", () => {
    const { result } = renderHook(() => useCallsTelemetry());
    act(() => {
      result.current("calls.replay.opened", {
        call_session_id: "sess-1",
        source: "qa",
      });
    });
    expect(mutateSpy).toHaveBeenCalledTimes(1);
    const [args] = mutateSpy.mock.calls[0];
    expect(args.event_type).toBe("calls.replay.opened");
    expect(args.source).toBe("calls:qa");
    expect(args.payload).toMatchObject({
      workspace_id: "ws-1",
      call_session_id: "sess-1",
      source: "qa",
    });
  });

  it("uses fallback source when none supplied", () => {
    const { result } = renderHook(() => useCallsTelemetry());
    act(() => result.current("calls.performance.viewed"));
    const [args] = mutateSpy.mock.calls[0];
    expect(args.source).toBe("calls");
    expect(args.payload).toMatchObject({ workspace_id: "ws-1" });
  });
});
