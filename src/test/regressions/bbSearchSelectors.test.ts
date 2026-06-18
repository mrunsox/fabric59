/**
 * Business Brain — Phase 3 search selectors view-model tests.
 *
 * Exercises the client-side normalization in `searchApprovedKnowledge`,
 * confidence-band derivation, and grouping rules. The edge function itself
 * is exercised in `bbSearchEdge.test.ts` (Deno).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const invoke = vi.fn();
  return { supabase: { functions: { invoke } } };
});

import { supabase } from "@/integrations/supabase/client";
import {
  searchApprovedKnowledge,
  triggerBbBackfill,
} from "@/lib/business-brain/selectors";

type InvokeMock = ReturnType<typeof vi.fn>;

describe("searchApprovedKnowledge", () => {
  beforeEach(() => {
    (supabase.functions.invoke as InvokeMock).mockReset();
  });

  it("returns an empty response when query is blank", async () => {
    const r = await searchApprovedKnowledge({ workspaceId: "w1", query: "  " });
    expect(r.cards).toEqual([]);
    expect(r.counts.total).toBe(0);
    expect((supabase.functions.invoke as InvokeMock)).not.toHaveBeenCalled();
  });

  it("returns an empty response when no workspace", async () => {
    const r = await searchApprovedKnowledge({ workspaceId: "", query: "hi" });
    expect(r.cards).toEqual([]);
  });

  it("returns an empty response when the edge function errors", async () => {
    (supabase.functions.invoke as InvokeMock).mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    const r = await searchApprovedKnowledge({ workspaceId: "w1", query: "hi" });
    expect(r.cards).toEqual([]);
  });

  it("normalizes cards: confidence band + groups facts before evidence", async () => {
    (supabase.functions.invoke as InvokeMock).mockResolvedValueOnce({
      data: {
        ok: true,
        latency_ms: 42,
        model: "openai/text-embedding-3-small",
        cards: [
          {
            kind: "fact",
            id: "f1",
            entityType: "faq",
            title: "Hours?",
            snippet: "We open 9-5.",
            evidence: [],
            score: 0.91,
            confidence: 0.92,
            verificationState: "approved",
            lastReviewedAt: "2026-06-01T00:00:00Z",
            factId: "f1",
          },
          {
            kind: "fact",
            id: "f2",
            entityType: "service",
            title: "Intake",
            snippet: null,
            evidence: [],
            score: 0.7,
            confidence: 0.55,
            verificationState: "approved",
            lastReviewedAt: "2026-06-01T00:00:00Z",
            factId: "f2",
          },
          {
            kind: "chunk",
            id: "c1",
            entityType: null,
            title: "Source",
            snippet: "raw text",
            evidence: [],
            score: 0.55,
            confidence: null,
            verificationState: null,
            lastReviewedAt: null,
            factId: null,
          },
        ],
        counts: { facts: 2, chunks: 1, total: 3 },
      },
      error: null,
    });

    const r = await searchApprovedKnowledge({ workspaceId: "w1", query: "hours" });
    expect(r.cards).toHaveLength(3);
    const [c1, c2, c3] = r.cards;
    expect(c1.confidenceBand).toBe("high");
    expect(c2.confidenceBand).toBe("medium");
    expect(c3.confidenceBand).toBeNull();
    expect(r.groups.faq).toHaveLength(1);
    expect(r.groups.service).toHaveLength(1);
    expect(r.groups._evidence).toHaveLength(1);
    expect(r.latencyMs).toBe(42);
  });

  it("forwards filters to the edge function", async () => {
    (supabase.functions.invoke as InvokeMock).mockResolvedValueOnce({
      data: { ok: true, cards: [], counts: { facts: 0, chunks: 0, total: 0 }, latency_ms: 1, model: "x" },
      error: null,
    });
    await searchApprovedKnowledge({
      workspaceId: "w1",
      query: "anything",
      entityTypes: ["faq"],
      includeNeedsReview: true,
      limit: 5,
    });
    const call = (supabase.functions.invoke as InvokeMock).mock.calls[0];
    expect(call[0]).toBe("bb-search");
    expect(call[1].body.filters.entityTypes).toEqual(["faq"]);
    expect(call[1].body.filters.includeNeedsReview).toBe(true);
    expect(call[1].body.limit).toBe(5);
  });
});

describe("triggerBbBackfill", () => {
  beforeEach(() => {
    (supabase.functions.invoke as InvokeMock).mockReset();
  });

  it("returns ok:false when no workspace id", async () => {
    const r = await triggerBbBackfill("");
    expect(r.ok).toBe(false);
  });

  it("aggregates totals from the edge response", async () => {
    (supabase.functions.invoke as InvokeMock).mockResolvedValueOnce({
      data: {
        ok: true,
        facts: { embedded: 3, failed: 1 },
        chunks: { embedded: 7, failed: 0 },
      },
      error: null,
    });
    const r = await triggerBbBackfill("w1");
    expect(r.ok).toBe(true);
    expect(r.facts).toBe(3);
    expect(r.chunks).toBe(7);
    expect(r.failed).toBe(1);
  });
});
