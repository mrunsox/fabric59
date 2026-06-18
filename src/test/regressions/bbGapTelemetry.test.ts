/**
 * Phase 7 — Telemetry guard: Phase 7 events accept only ids/types/counts
 * and never carry raw query text or fact payloads. Disallowed keys are
 * stripped before emit; raw_query is never an allowed payload field.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  BB_EVENT_TYPES,
  emitBbEvent,
  __setBbTelemetryEmitter,
} from "@/lib/business-brain/telemetry";

describe("bbGapTelemetry", () => {
  let captured: Array<{ type: string; payload: Record<string, unknown> }> = [];

  beforeEach(() => {
    captured = [];
    __setBbTelemetryEmitter((type, payload) => {
      captured.push({ type, payload });
    });
  });

  it("registers all Phase 7 event types", () => {
    for (const t of [
      "bb_gap_event_logged",
      "bb_gap_cluster_run",
      "bb_gap_topic_action",
      "bb_gap_governance_view_opened",
    ]) {
      expect((BB_EVENT_TYPES as readonly string[]).includes(t)).toBe(true);
    }
  });

  it("emits gap_event_logged with channel + contextKind only", () => {
    emitBbEvent("bb_gap_event_logged", {
      workspaceId: "ws-1",
      organizationId: "org-1",
      channel: "search",
      contextKind: "no_results",
      // attempt to smuggle raw text:
      // @ts-expect-error not in payload type
      rawQuery: "this should be stripped",
    });
    expect(captured).toHaveLength(1);
    const { payload } = captured[0];
    expect(payload.channel).toBe("search");
    expect(payload.contextKind).toBe("no_results");
    expect("rawQuery" in payload).toBe(false);
    expect("raw_query" in payload).toBe(false);
  });

  it("emits gap_topic_action with action + ids only", () => {
    emitBbEvent("bb_gap_topic_action", {
      workspaceId: "ws-1",
      organizationId: "org-1",
      gapTopicId: "gt-1",
      gapTopicAction: "create_fact_draft",
      entityType: "faq",
    });
    expect(captured[0].payload.gapTopicAction).toBe("create_fact_draft");
    expect(captured[0].payload.gapTopicId).toBe("gt-1");
  });

  it("emits cluster_run with counts only", () => {
    emitBbEvent("bb_gap_cluster_run", {
      workspaceId: "ws-1",
      organizationId: "org-1",
      workspacesEvaluated: 1,
      topicsCreated: 2,
      topicsUpdated: 1,
      topicsPruned: 0,
      eventsAssigned: 5,
    });
    expect(captured[0].payload.topicsCreated).toBe(2);
    expect("rawQuery" in captured[0].payload).toBe(false);
  });
});
