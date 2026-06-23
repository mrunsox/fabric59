/**
 * Phase 8 — Performance metrics + coaching queue regression.
 */
import { describe, it, expect } from "vitest";
import {
  bucketDisposition,
  computeCallMetrics,
  selectCoachingCandidates,
  summarizeOverTime,
  type PerformanceCallSession,
  type PerformanceOutcome,
  type PerformanceQaReview,
  type PerformanceSnapshotRecord,
} from "@/lib/workspace/performance/metrics";
import type { CallSessionSnapshotV1 } from "@/lib/workspace/callSessions/snapshotContract";

function s(
  id: string,
  partial: Partial<PerformanceCallSession> = {},
): PerformanceCallSession {
  return {
    id,
    workspace_id: "ws-1",
    campaign_id: "camp-1",
    status: "completed",
    started_at: "2026-06-23T10:00:00Z",
    ended_at: "2026-06-23T10:05:00Z",
    duration_seconds: 300,
    ...partial,
  };
}

function snap(sessionId: string, used = 0): PerformanceSnapshotRecord {
  const snapshot: CallSessionSnapshotV1 = {
    session: {
      id: sessionId,
      workspace_id: "ws-1",
      campaign_id: "camp-1",
      agent_id: null,
      status: "completed",
      phase: "completed" as never,
      started_at: "2026-06-23T10:00:00Z",
      ended_at: "2026-06-23T10:05:00Z",
      duration_seconds: 300,
      ani: null,
      caller_label: { value: "Unknown", source: "unknown" },
    },
    knowledge_bin: { captured_at: "2026-06-23T10:05:00Z", groups: [] },
    events: [],
    outcome: { disposition_id: null, disposition_label: null, notes_excerpt: null },
    ai_assist: {
      used_suggestions: Array.from({ length: used }, (_, i) => ({
        ts: "2026-06-23T10:04:00Z",
        suggestion_id: `sug-${i}`,
        source_precedence: 1,
        source_type: "live_session" as never,
        action: "accepted" as const,
      })),
    },
  };
  return { call_session_id: sessionId, snapshot };
}

describe("bucketDisposition", () => {
  it("classifies known dispositions deterministically", () => {
    expect(bucketDisposition("sale_won")).toBe("success");
    expect(bucketDisposition("Qualified")).toBe("success");
    expect(bucketDisposition("voicemail")).toBe("soft_fail");
    expect(bucketDisposition("callback")).toBe("soft_fail");
    expect(bucketDisposition("DNC")).toBe("hard_fail");
    expect(bucketDisposition("hung_up")).toBe("hard_fail");
    expect(bucketDisposition("unknown_label")).toBe("other");
    expect(bucketDisposition(null)).toBe("other");
    expect(bucketDisposition("")).toBe("other");
  });
});

describe("computeCallMetrics", () => {
  it("returns zero state for empty input", () => {
    const m = computeCallMetrics({ sessions: [], outcomes: [], qaReviews: [], snapshots: [] });
    expect(m.totalCalls).toBe(0);
    expect(m.aiUsageRate).toBeNull();
    expect(m.avgHandleSeconds).toBeNull();
    expect(m.snapshotCoverageRate).toBe(0);
  });

  it("computes mixed metrics with partial snapshot coverage", () => {
    const sessions = [
      s("a", { status: "completed", duration_seconds: 200 }),
      s("b", { status: "completed", duration_seconds: 400 }),
      s("c", { status: "abandoned", duration_seconds: 0 }),
      s("d", { status: "completed", duration_seconds: 600 }),
    ];
    const outcomes: PerformanceOutcome[] = [
      { call_session_id: "a", disposition: "sale_won" },
      { call_session_id: "b", disposition: "voicemail" },
      { call_session_id: "c", disposition: "dnc" },
    ];
    const qa: PerformanceQaReview[] = [{ call_session_id: "a", status: "completed" }];
    const snapshots = [snap("a", 2), snap("b", 0)]; // only 2 have snapshots; 1 used AI

    const m = computeCallMetrics({ sessions, outcomes, qaReviews: qa, snapshots });
    expect(m.totalCalls).toBe(4);
    expect(m.completedCalls).toBe(3);
    expect(m.completionRate).toBeCloseTo(0.75);
    expect(m.dispositionBuckets).toEqual({ success: 1, soft_fail: 1, hard_fail: 1, other: 0 });
    expect(m.successDispositionRate).toBeCloseTo(1 / 3);
    expect(m.avgHandleSeconds).toBeCloseTo(400); // (200+400+600)/3, c excluded (0)
    expect(m.aiUsageRate).toBeCloseTo(0.5); // 1 of 2 snapshot-covered
    expect(m.aiUsageDenominator).toBe(2);
    expect(m.qaCoverageRate).toBeCloseTo(0.25);
    expect(m.snapshotCoverageRate).toBeCloseTo(0.5);
  });

  it("returns null AI rate when no snapshots", () => {
    const m = computeCallMetrics({
      sessions: [s("a")],
      outcomes: [],
      qaReviews: [],
      snapshots: [],
    });
    expect(m.aiUsageRate).toBeNull();
    expect(m.aiUsageDenominator).toBe(0);
  });
});

describe("summarizeOverTime", () => {
  it("buckets sessions per UTC day across window", () => {
    const today = new Date().toISOString().slice(0, 10);
    const points = summarizeOverTime([s("a", { started_at: `${today}T05:00:00Z` })], 7);
    expect(points.length).toBe(7);
    expect(points[points.length - 1].date).toBe(today);
    expect(points[points.length - 1].count).toBe(1);
  });
});

describe("selectCoachingCandidates", () => {
  const sessions = [
    s("hard", { started_at: "2026-06-20T10:00:00Z" }),
    s("soft", { started_at: "2026-06-22T10:00:00Z" }),
    s("tag", { started_at: "2026-06-23T10:00:00Z" }),
    s("newest", { started_at: "2026-06-23T12:00:00Z" }),
  ];
  const outcomes: PerformanceOutcome[] = [
    { call_session_id: "hard", disposition: "dnc" },
    { call_session_id: "soft", disposition: "voicemail" },
    { call_session_id: "tag", disposition: "info_only" }, // also soft_fail by rule
  ];

  it("ranks hard_fail > soft_fail and respects limit", () => {
    const list = selectCoachingCandidates({
      sessions,
      outcomes,
      qaReviews: [],
      snapshots: [],
      limit: 10,
    });
    expect(list[0].sessionId).toBe("hard");
    expect(list.find((c) => c.sessionId === "soft")?.reasons).toContain("Soft fail");
  });

  it("marks reviewed but keeps them in the queue", () => {
    const list = selectCoachingCandidates({
      sessions,
      outcomes,
      qaReviews: [{ call_session_id: "hard", status: "completed" }],
      snapshots: [],
    });
    const hard = list.find((c) => c.sessionId === "hard");
    expect(hard?.reviewed).toBe(true);
    expect(list[0].sessionId).toBe("hard");
  });

  it("boosts via AI tags when supplied", () => {
    const list = selectCoachingCandidates({
      sessions: [s("plain", { started_at: "2026-06-23T13:00:00Z" })],
      outcomes: [{ call_session_id: "plain", disposition: "other_misc" }],
      qaReviews: [],
      snapshots: [],
      aiTags: new Map([["plain", ["frustrated"]]]),
    });
    expect(list[0].reasons).toContain("Frustrated");
  });

  it("caps at limit", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      s(`x${i}`, { started_at: `2026-06-${10 + (i % 20)}T10:00:00Z` }),
    );
    const o = many.map((m) => ({ call_session_id: m.id, disposition: "dnc" }));
    const list = selectCoachingCandidates({
      sessions: many,
      outcomes: o,
      qaReviews: [],
      snapshots: [],
      limit: 20,
    });
    expect(list.length).toBe(20);
  });
});
