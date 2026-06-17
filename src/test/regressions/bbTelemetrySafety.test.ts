/**
 * Business Brain — telemetry safety (Slice 1).
 *
 * Telemetry must never throw and must never block UX even if the emitter
 * fails. Unknown event types are rejected silently.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BB_EVENT_TYPES,
  emitBbEvent,
  __setBbTelemetryEmitter,
} from "@/lib/business-brain/telemetry";

describe("Business Brain telemetry", () => {
  beforeEach(() => {
    __setBbTelemetryEmitter(null);
  });

  it("only allows the documented event catalog", () => {
    expect(BB_EVENT_TYPES).toContain("bb_source_added");
    expect(BB_EVENT_TYPES).toContain("bb_fact_approved");
    expect(BB_EVENT_TYPES).toContain("bb_fact_merged");
  });

  it("forwards events to the configured emitter with the bb prefix", () => {
    const calls: Array<{ type: string; payload: Record<string, unknown>; org: string | null }> = [];
    __setBbTelemetryEmitter((type, payload, organizationId) => {
      calls.push({ type, payload, org: organizationId });
    });
    emitBbEvent("bb_fact_approved", {
      workspaceId: "ws-1",
      organizationId: "org-1",
      factId: "f1",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe("bb_fact_approved");
    expect(calls[0].payload.workspaceId).toBe("ws-1");
    expect(calls[0].payload.factId).toBe("f1");
    expect(calls[0].org).toBe("org-1");
  });

  it("rejects unknown event types silently", () => {
    const spy = vi.fn();
    __setBbTelemetryEmitter(spy);
    // @ts-expect-error — intentionally bad
    emitBbEvent("bb_not_a_real_event", { workspaceId: "ws" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("never throws even when the emitter throws synchronously", () => {
    __setBbTelemetryEmitter(() => {
      throw new Error("boom");
    });
    expect(() =>
      emitBbEvent("bb_fact_approved", { organizationId: "org-1" }),
    ).not.toThrow();
  });

  it("never throws even when the emitter rejects asynchronously", async () => {
    __setBbTelemetryEmitter(async () => {
      throw new Error("async boom");
    });
    expect(() =>
      emitBbEvent("bb_source_added", { organizationId: "org-1" }),
    ).not.toThrow();
    // give the rejection a microtask to settle without crashing
    await Promise.resolve();
  });
});
