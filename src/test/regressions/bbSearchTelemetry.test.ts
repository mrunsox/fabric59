/**
 * Business Brain telemetry — Phase 3 privacy-safe invariants.
 *
 * Asserts that the Phase 3 event types are registered and that the
 * payload sanitizer DROPS any key not on the allowlist — protecting against
 * accidental leakage of raw query text, snippet text, or fact payloads.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

import {
  BB_EVENT_TYPES,
  emitBbEvent,
  __setBbTelemetryEmitter,
} from "@/lib/business-brain/telemetry";

describe("BB Phase 3 telemetry", () => {
  afterEach(() => __setBbTelemetryEmitter(null));

  it("registers all Phase 3 event types", () => {
    for (const t of [
      "bb_search_query_submitted",
      "bb_search_result_opened",
      "bb_search_result_marked",
      "bb_search_reindex_started",
      "bb_embed_run_completed",
    ]) {
      expect((BB_EVENT_TYPES as readonly string[]).includes(t)).toBe(true);
    }
  });

  it("sanitizer drops payload keys that are not on the allowlist", () => {
    const seen: Array<{ type: string; payload: Record<string, unknown> }> = [];
    __setBbTelemetryEmitter((type, payload) => {
      seen.push({ type, payload });
    });
    emitBbEvent("bb_search_query_submitted", {
      workspaceId: "w1",
      organizationId: "o1",
      queryLength: 42,
      resultCount: 7,
      // Intentionally include disallowed keys via cast:
      query: "raw query text that must never persist",
      snippet: "raw snippet",
      payload: { secret: true },
    } as unknown as Parameters<typeof emitBbEvent>[1]);
    expect(seen).toHaveLength(1);
    const p = seen[0].payload;
    expect(p.queryLength).toBe(42);
    expect(p.resultCount).toBe(7);
    expect(p.workspaceId).toBe("w1");
    expect(p.query).toBeUndefined();
    expect(p.snippet).toBeUndefined();
    expect(p.payload).toBeUndefined();
  });

  it("rejects unknown event types", () => {
    const fired = vi.fn();
    __setBbTelemetryEmitter(fired);
    emitBbEvent("not_a_real_event" as never, { workspaceId: "w1" });
    expect(fired).not.toHaveBeenCalled();
  });
});
