/**
 * ASC Telemetry — contract regression (Phase 6 · Slice 2).
 *
 * Verifies the documented event catalog and payload key allowlist. Unknown
 * event types must be silently rejected (no throw, no emit).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  emitAscEvent,
  ASC_EVENT_TYPES,
  __setAscTelemetryEmitter,
  type AscEventType,
} from "@/lib/asc/telemetry";

describe("ASC telemetry contract", () => {
  const spy = vi.fn();

  beforeEach(() => {
    spy.mockReset();
    __setAscTelemetryEmitter((eventType, payload, orgId, source) => {
      spy({ eventType, payload, orgId, source });
    });
  });

  it("emits every documented event type", () => {
    for (const t of ASC_EVENT_TYPES) {
      emitAscEvent(t, {
        ascDraftId: "d1",
        workspaceId: "w1",
        organizationId: "o1",
      });
    }
    expect(spy).toHaveBeenCalledTimes(ASC_EVENT_TYPES.length);
    const seen = spy.mock.calls.map((c) => c[0].eventType);
    expect(new Set(seen)).toEqual(new Set(ASC_EVENT_TYPES));
  });

  it("rejects unknown event types silently", () => {
    expect(() =>
      emitAscEvent("not_a_real_event" as unknown as AscEventType, {
        ascDraftId: "d",
        organizationId: "o",
      }),
    ).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("strips unknown payload keys and undefined values", () => {
    emitAscEvent("asc_ai_call", {
      ascDraftId: "d1",
      workspaceId: "w1",
      organizationId: "o1",
      step: 3,
      role: "interviewer",
      outcome: "ok",
      errorCode: undefined,
      // Unknown key — must be dropped.
      // @ts-expect-error intentional unknown key
      bogus: "no",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0].payload;
    expect(payload).toEqual({
      ascDraftId: "d1",
      workspaceId: "w1",
      organizationId: "o1",
      step: 3,
      role: "interviewer",
      outcome: "ok",
    });
  });

  it("derives source from event type by default", () => {
    emitAscEvent("asc_wizard_opened", { organizationId: "o" });
    emitAscEvent("canonical_from_asc_opened", { organizationId: "o" });
    expect(spy.mock.calls[0][0].source).toBe("asc");
    expect(spy.mock.calls[1][0].source).toBe("canonical");
  });
});
