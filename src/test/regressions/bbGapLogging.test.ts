/**
 * Phase 7 — Validates that the gap-signal logger produces the expected shape
 * for search/ASC/assist channels without leaking text beyond the raw_query
 * field and that under-length queries are dropped.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { then: (fn: (v: unknown) => unknown) => Promise.resolve(fn({})) };
      },
    }),
  },
}));

import { logGapSignal } from "@/lib/business-brain/gapLogging";

describe("bbGapLogging", () => {
  beforeEach(() => {
    inserts.length = 0;
  });

  it("logs a search gap event with normalized text and context", () => {
    logGapSignal({
      workspaceId: "ws-1",
      channel: "search",
      rawQuery: "  What ARE your HOURS??  ",
      context: { reason: "no_results" },
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("bb_gap_events");
    expect(inserts[0].row.channel).toBe("search");
    expect(inserts[0].row.workspace_id).toBe("ws-1");
    expect(inserts[0].row.normalized_query).toBe("what are your hours");
    expect((inserts[0].row.context as Record<string, unknown>).reason).toBe("no_results");
  });

  it("logs ASC and assist channels", () => {
    logGapSignal({ workspaceId: "ws-2", channel: "asc", rawQuery: "asc step 3" });
    logGapSignal({ workspaceId: "ws-2", channel: "assist", rawQuery: "billing question" });
    expect(inserts.map((i) => i.row.channel)).toEqual(["asc", "assist"]);
  });

  it("drops too-short or empty queries", () => {
    logGapSignal({ workspaceId: "ws-3", channel: "search", rawQuery: "" });
    logGapSignal({ workspaceId: "ws-3", channel: "search", rawQuery: " . " });
    expect(inserts).toHaveLength(0);
  });

  it("drops events without a workspaceId", () => {
    logGapSignal({ workspaceId: "", channel: "search", rawQuery: "valid query" });
    expect(inserts).toHaveLength(0);
  });
});
