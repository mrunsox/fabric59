/**
 * Phase 9 — AI tag wiring into the coaching queue.
 *
 * `selectCoachingCandidates` should:
 *   - infer FLAG_TAGS from snapshot notes / disposition labels,
 *   - accept explicit aiTags from the caller and merge dedup'd,
 *   - keep deterministic ranking: hard_fail > soft_fail > AI-tagged > newest,
 *   - format tag reason labels (e.g. "cancellation_risk" → "Cancellation Risk").
 */
import { describe, it, expect } from "vitest";
import {
  extractAiTagsFromSnapshot,
  selectCoachingCandidates,
  type PerformanceCallSession,
  type PerformanceSnapshotRecord,
} from "@/lib/workspace/performance/metrics";
import type { CallSessionSnapshotV1 } from "@/lib/workspace/callSessions/snapshotContract";

function s(id: string, startedAt: string): PerformanceCallSession {
  return {
    id,
    workspace_id: "ws",
    campaign_id: "c1",
    status: "completed",
    started_at: startedAt,
    ended_at: startedAt,
    duration_seconds: 120,
  };
}

function snapWithNotes(id: string, notes: string, disposition: string | null = null): PerformanceSnapshotRecord {
  const snapshot: CallSessionSnapshotV1 = {
    session: {
      id,
      workspace_id: "ws",
      campaign_id: "c1",
      agent_id: null,
      status: "completed",
      phase: "completed" as never,
      started_at: "2026-06-23T10:00:00Z",
      ended_at: "2026-06-23T10:02:00Z",
      duration_seconds: 120,
      ani: null,
      caller_label: { value: "?", source: "unknown" },
    },
    knowledge_bin: { captured_at: "2026-06-23T10:02:00Z", groups: [] },
    events: [],
    outcome: {
      disposition_id: null,
      disposition_label: disposition,
      notes_excerpt: notes,
    },
    ai_assist: { used_suggestions: [] },
  };
  return { call_session_id: id, snapshot };
}

describe("extractAiTagsFromSnapshot", () => {
  it("returns [] for empty snapshot", () => {
    expect(extractAiTagsFromSnapshot(null)).toEqual([]);
  });

  it("picks up cancellation_risk and frustrated from notes", () => {
    const tags = extractAiTagsFromSnapshot(
      snapWithNotes("x", "Caller is frustrated and wants to cancel their plan").snapshot,
    );
    expect(tags).toContain("frustrated");
    expect(tags).toContain("cancellation_risk");
  });

  it("picks up escalation from disposition label", () => {
    const tags = extractAiTagsFromSnapshot(
      snapWithNotes("x", "", "Escalated to supervisor").snapshot,
    );
    expect(tags).toContain("escalation");
  });
});

describe("selectCoachingCandidates — Phase 9 AI tag wiring", () => {
  it("surfaces snapshot-inferred AI tags as reasons", () => {
    const list = selectCoachingCandidates({
      sessions: [s("a", "2026-06-23T13:00:00Z")],
      outcomes: [{ call_session_id: "a", disposition: "info_call" }],
      qaReviews: [],
      snapshots: [snapWithNotes("a", "Caller was frustrated about billing")],
    });
    expect(list[0].reasons).toContain("Frustrated");
  });

  it("merges explicit aiTags map with snapshot-inferred tags without duplicates", () => {
    const list = selectCoachingCandidates({
      sessions: [s("a", "2026-06-23T13:00:00Z")],
      outcomes: [],
      qaReviews: [],
      snapshots: [snapWithNotes("a", "frustrated customer")],
      aiTags: new Map([["a", ["frustrated", "complaint"]]]),
    });
    const reasons = list[0].reasons;
    expect(reasons.filter((r) => r === "Frustrated").length).toBe(1);
    expect(reasons).toContain("Complaint");
  });

  it("keeps hard_fail ranked above tag-only candidates", () => {
    const list = selectCoachingCandidates({
      sessions: [
        s("hard", "2026-06-23T10:00:00Z"),
        s("tag", "2026-06-23T13:00:00Z"),
      ],
      outcomes: [{ call_session_id: "hard", disposition: "dnc" }],
      qaReviews: [],
      snapshots: [snapWithNotes("tag", "Caller is frustrated")],
    });
    expect(list[0].sessionId).toBe("hard");
  });
});
