/**
 * ASC Telemetry — safety regression (Phase 6 · Slice 2).
 *
 * Telemetry must never throw and must never mutate caller-provided payload
 * objects, even when the underlying emitter explodes.
 */
import { describe, it, expect, vi } from "vitest";
import { emitAscEvent, __setAscTelemetryEmitter } from "@/lib/asc/telemetry";

describe("ASC telemetry safety", () => {
  it("swallows emitter errors silently", () => {
    __setAscTelemetryEmitter(() => {
      throw new Error("kaboom");
    });
    expect(() =>
      emitAscEvent("asc_wizard_opened", {
        ascDraftId: "d",
        organizationId: "o",
      }),
    ).not.toThrow();
  });

  it("swallows rejected async emitter promises", async () => {
    __setAscTelemetryEmitter(() => Promise.reject(new Error("nope")));
    expect(() =>
      emitAscEvent("asc_wizard_opened", {
        ascDraftId: "d",
        organizationId: "o",
      }),
    ).not.toThrow();
    // Give microtask queue a tick to surface unhandled rejections.
    await new Promise((r) => setTimeout(r, 0));
  });

  it("does not mutate caller-provided payload objects", () => {
    const spy = vi.fn();
    __setAscTelemetryEmitter((_t, p) => spy(p));
    const input = {
      ascDraftId: "d",
      workspaceId: "w",
      organizationId: "o",
      step: 1,
    };
    const snapshot = JSON.stringify(input);
    emitAscEvent("asc_step_completed", input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
