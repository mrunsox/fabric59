/**
 * Phase 7B — snapshot-only AI helpers.
 *
 * Confirms that summarizeCallFromSnapshot and suggestQaChecksFromSnapshot:
 *   - pass the snapshot to the edge function as their only input,
 *   - return `insufficient_data` for empty snapshots,
 *   - handle gateway errors gracefully (no throw).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import {
  summarizeCallFromSnapshot,
  suggestQaChecksFromSnapshot,
} from "@/lib/workspace/callSessions/aiSummaries";
import type { CallSessionSnapshotV1 } from "@/lib/workspace/callSessions/snapshotContract";

const usable: CallSessionSnapshotV1 = {
  session: {
    id: "s1",
    workspace_id: "ws-1",
    campaign_id: null,
    agent_id: null,
    status: "completed",
    phase: "completed",
    started_at: "2026-06-23T10:00:00Z",
    ended_at: "2026-06-23T10:04:00Z",
    duration_seconds: 240,
    ani: "555",
    caller_label: { value: "555", source: "telephony" },
  },
  knowledge_bin: { captured_at: "2026-06-23T10:05:00Z", groups: [] },
  events: [{ ts: "2026-06-23T10:01:00Z", type: "phase_change", from: "live", to: "wrap_up" }],
  outcome: { disposition_id: "d1", disposition_label: "Booked", notes_excerpt: null },
  ai_assist: { used_suggestions: [] },
};

const empty: CallSessionSnapshotV1 = {
  ...usable,
  events: [],
  outcome: { disposition_id: null, disposition_label: null, notes_excerpt: null },
  knowledge_bin: { captured_at: "2026-06-23T10:05:00Z", groups: [] },
};

beforeEach(() => {
  invoke.mockReset();
});

describe("Phase 7B — snapshot-only AI summaries", () => {
  it("summarizeCallFromSnapshot passes the snapshot as the only input", async () => {
    invoke.mockResolvedValue({ data: { summary: "Brief.", tags: ["billing"] }, error: null });
    const r = await summarizeCallFromSnapshot(usable);
    expect(invoke).toHaveBeenCalledWith("call-snapshot-ai", {
      body: { mode: "summary", snapshot: usable },
    });
    expect(r.summary).toBe("Brief.");
    expect(r.tags).toEqual(["billing"]);
    expect(r.generated_from).toEqual({ version: 1, captured_at: "2026-06-23T10:05:00Z" });
  });

  it("summarizeCallFromSnapshot returns insufficient_data for empty snapshots", async () => {
    const r = await summarizeCallFromSnapshot(empty);
    expect(invoke).not.toHaveBeenCalled();
    expect(r.reason).toBe("insufficient_data");
    expect(r.summary).toBeNull();
  });

  it("summarizeCallFromSnapshot swallows gateway errors", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    const r = await summarizeCallFromSnapshot(usable);
    expect(r.reason).toBe("insufficient_data");
    expect(r.summary).toBeNull();
  });

  it("suggestQaChecksFromSnapshot trims and caps hints", async () => {
    invoke.mockResolvedValue({
      data: { hints: ["a", "b", "c", "d", "e", "f", "g"] },
      error: null,
    });
    const r = await suggestQaChecksFromSnapshot(usable);
    expect(invoke).toHaveBeenCalledWith("call-snapshot-ai", {
      body: { mode: "qa_hints", snapshot: usable },
    });
    expect(r.hints).toHaveLength(5);
  });

  it("suggestQaChecksFromSnapshot returns insufficient_data when empty", async () => {
    const r = await suggestQaChecksFromSnapshot(empty);
    expect(invoke).not.toHaveBeenCalled();
    expect(r.reason).toBe("insufficient_data");
    expect(r.hints).toEqual([]);
  });
});
