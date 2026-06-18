import { describe, expect, it } from "vitest";

// Mirrors the SCORE_WEIGHTS in bb-usage-rollup to verify explainability.
const SCORE_WEIGHTS: Record<string, number> = {
  search_opens: 1,
  search_marked_useful: 3,
  search_marked_not_useful: -1,
  asc_suggestion_used: 4,
  asc_suggestion_dismissed: -0.5,
  assist_opened: 1,
  assist_copied: 3,
  assist_inserted: 5,
};

function computeScore(counters: Record<string, number>): number {
  let s = 0;
  for (const k of Object.keys(SCORE_WEIGHTS)) s += (counters[k] ?? 0) * SCORE_WEIGHTS[k];
  return Math.max(0, s);
}

describe("bb usage rollup — explainable scoring", () => {
  it("weights insert > copy > open", () => {
    expect(computeScore({ assist_inserted: 1 })).toBeGreaterThan(computeScore({ assist_copied: 1 }));
    expect(computeScore({ assist_copied: 1 })).toBeGreaterThan(computeScore({ assist_opened: 1 }));
  });
  it("not-useful subtracts from score but never goes below zero", () => {
    expect(computeScore({ search_marked_not_useful: 10 })).toBe(0);
  });
  it("combines signals additively", () => {
    const a = computeScore({ search_opens: 2, assist_inserted: 1 });
    expect(a).toBe(2 * 1 + 1 * 5);
  });
});
