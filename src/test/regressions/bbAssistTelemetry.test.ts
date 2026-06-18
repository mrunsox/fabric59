/**
 * Phase 4 — telemetry privacy invariants for live runner assist.
 *
 * Asserts that:
 *   - All new event types are registered on the BB allowlist.
 *   - The sanitize step drops any disallowed keys we might pass by mistake
 *     (raw text, snippets, source titles, note content, etc.).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  BB_EVENT_TYPES,
  __setBbTelemetryEmitter,
  emitBbEvent,
} from "@/lib/business-brain/telemetry";

const PHASE_4_EVENTS = [
  "bb_assist_panel_shown",
  "bb_assist_card_opened",
  "bb_assist_card_copied",
  "bb_assist_card_inserted",
  "bb_assist_refresh_triggered",
  "bb_assist_no_results",
] as const;

describe("BB Phase 4 — telemetry privacy", () => {
  beforeEach(() => __setBbTelemetryEmitter(null));

  it("registers all Phase 4 event types", () => {
    for (const ev of PHASE_4_EVENTS) {
      expect((BB_EVENT_TYPES as readonly string[]).includes(ev)).toBe(true);
    }
  });

  it("drops disallowed text fields from payloads", () => {
    const captured: Array<Record<string, unknown>> = [];
    __setBbTelemetryEmitter((_t, payload) => {
      captured.push(payload);
    });
    emitBbEvent("bb_assist_card_copied", {
      workspaceId: "ws1",
      organizationId: "org1",
      cardKind: "intent_hint",
      entityType: "faq",
      factId: "fact-1",
      // Disallowed fields — would leak content if accepted. Cast through
      // unknown so the type system doesn't reject them outright; the
      // runtime sanitizer is what we are validating here.
      ...({
        snippet: "Some snippet content",
        sourceTitle: "Confidential Doc",
        noteContent: "patient said X",
        query: "raw user query",
      } as unknown as Record<string, unknown>),
    });

    expect(captured).toHaveLength(1);
    const p = captured[0];
    expect(p.snippet).toBeUndefined();
    expect(p.sourceTitle).toBeUndefined();
    expect(p.noteContent).toBeUndefined();
    expect(p.query).toBeUndefined();
    // allowed fields preserved
    expect(p.cardKind).toBe("intent_hint");
    expect(p.entityType).toBe("faq");
    expect(p.factId).toBe("fact-1");
  });

  it("rejects unknown event types silently (no throw)", () => {
    const captured: string[] = [];
    __setBbTelemetryEmitter((t) => { captured.push(t); });
    emitBbEvent(
      "bb_assist_definitely_not_a_real_event" as unknown as Parameters<typeof emitBbEvent>[0],
      { workspaceId: "ws1" },
    );
    expect(captured).toHaveLength(0);
  });
});
