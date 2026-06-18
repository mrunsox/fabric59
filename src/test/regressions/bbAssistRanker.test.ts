import { describe, it, expect } from "vitest";
import { rankAssistCards, ASSIST_DEFAULTS } from "@/lib/business-brain/assistRanker";
import type { AssistSessionContext } from "@/lib/business-brain/assistContext";
import type { ApprovedFactView } from "@/lib/business-brain/selectors";
import type { BbEntityType } from "@/lib/business-brain/types";

function fact(
  id: string,
  entityType: BbEntityType,
  overrides: Partial<ApprovedFactView> = {},
): ApprovedFactView {
  return {
    id,
    workspaceId: "ws1",
    clientId: null,
    entityType,
    displayName: overrides.displayName ?? `Fact ${id}`,
    payload: (overrides.payload ?? {}) as Readonly<Record<string, unknown>>,
    verificationState: overrides.verificationState ?? "approved",
    confidenceAtReview: overrides.confidenceAtReview ?? 0.9,
    lastReviewedAt: overrides.lastReviewedAt ?? "2026-01-01T00:00:00Z",
    sourceCount: overrides.sourceCount ?? 0,
    firstSnippet: overrides.firstSnippet ?? null,
    firstSourceId: overrides.firstSourceId ?? null,
  };
}

function ctx(overrides: Partial<AssistSessionContext> = {}): AssistSessionContext {
  return {
    workspaceId: "ws1",
    clientId: null,
    stepId: "s1",
    stepKind: "intent",
    stepTitle: "Why are you calling?",
    serviceHints: [],
    destinationHints: [],
    afterHours: false,
    hasContext: true,
    ...overrides,
  };
}

describe("rankAssistCards", () => {
  it("returns empty when no facts approved", () => {
    expect(rankAssistCards([], ctx())).toEqual([]);
  });

  it("filters needs_review and stale; only surfaces approved", () => {
    const cards = rankAssistCards(
      [
        fact("a", "faq", { verificationState: "needs_review", payload: { question: "Q?" } }),
        fact("b", "faq", { payload: { question: "Q ok?" } }),
      ],
      ctx(),
    );
    expect(cards.map((c) => c.factId)).toEqual(["b"]);
  });

  it("ranks step relevance first, then entity match (service hint), then confidence, then recency", () => {
    const c = ctx({
      stepKind: "intent",
      serviceHints: ["family law"],
    });
    const facts = [
      // High step relevance + matches service hint
      fact("match", "faq", {
        payload: { question: "Family Law fees?" },
        confidenceAtReview: 0.7,
        lastReviewedAt: "2025-01-01T00:00:00Z",
      }),
      // Higher confidence but no service match
      fact("plain", "faq", {
        payload: { question: "Office hours?" },
        confidenceAtReview: 0.95,
        lastReviewedAt: "2025-12-01T00:00:00Z",
      }),
      // Lower step relevance entity
      fact("policy", "policy", {
        confidenceAtReview: 0.99,
        lastReviewedAt: "2026-06-01T00:00:00Z",
      }),
    ];
    const cards = rankAssistCards(facts, c);
    expect(cards[0].factId).toBe("match");
  });

  it("boosts hours/escalation after-hours", () => {
    const c = ctx({ stepKind: "info", afterHours: true });
    const cards = rankAssistCards(
      [
        fact("h", "hours", { payload: { label: "Standard", schedule: "9-5" } }),
        fact("f", "faq", { payload: { question: "Fees?" } }),
      ],
      c,
    );
    expect(cards[0]?.entityType).toBe("hours");
  });

  it("caps at 5 (default max)", () => {
    const facts = Array.from({ length: 8 }, (_, i) =>
      fact(`f${i}`, "faq", { payload: { question: `Q${i}?` } }),
    );
    const cards = rankAssistCards(facts, ctx());
    expect(cards).toHaveLength(ASSIST_DEFAULTS.MAX);
  });

  it("quiet-mode: weak context (no step + no hints + not after-hours) caps to 2", () => {
    const facts = Array.from({ length: 5 }, (_, i) =>
      fact(`f${i}`, "faq", { payload: { question: `Q${i}?` } }),
    );
    const c = ctx({
      stepKind: "unknown",
      stepId: null,
      serviceHints: [],
      destinationHints: [],
      afterHours: false,
      hasContext: false,
    });
    const cards = rankAssistCards(facts, c);
    expect(cards.length).toBeLessThanOrEqual(ASSIST_DEFAULTS.WEAK_CONTEXT_MAX);
  });

  it("drops facts below confidence threshold", () => {
    const cards = rankAssistCards(
      [
        fact("lo", "faq", { payload: { question: "Q?" }, confidenceAtReview: 0.2 }),
        fact("hi", "faq", { payload: { question: "Q ok?" }, confidenceAtReview: 0.9 }),
      ],
      ctx(),
    );
    expect(cards.map((c) => c.factId)).toEqual(["hi"]);
  });

  it("dedupes by factId", () => {
    const cards = rankAssistCards(
      [
        fact("x", "faq", { payload: { question: "Q?" } }),
        fact("x", "faq", { payload: { question: "Q?" } }),
      ],
      ctx(),
    );
    expect(cards).toHaveLength(1);
  });
});
