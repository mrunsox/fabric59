import { describe, expect, it } from "vitest";

// Pure helper extracted from bb-maintain-facts: pick the single-valued
// stale_state from a set of underlying reasons.
function pickPrimaryState(reasons: string[]): string {
  const PRI = ["stale_due_to_conflict", "stale_due_to_usage", "stale_due_to_age"];
  if (!reasons.length) return "fresh";
  for (const r of PRI) if (reasons.includes(r)) return r;
  return "fresh";
}

describe("bb staleness — primary-reason selection", () => {
  it("returns 'fresh' for empty reasons", () => {
    expect(pickPrimaryState([])).toBe("fresh");
  });
  it("prefers conflict over usage and age", () => {
    expect(pickPrimaryState(["stale_due_to_age", "stale_due_to_usage", "stale_due_to_conflict"])).toBe(
      "stale_due_to_conflict",
    );
  });
  it("prefers usage over age when no conflict", () => {
    expect(pickPrimaryState(["stale_due_to_age", "stale_due_to_usage"])).toBe("stale_due_to_usage");
  });
  it("falls back to age", () => {
    expect(pickPrimaryState(["stale_due_to_age"])).toBe("stale_due_to_age");
  });
});

describe("bb staleness — interval math", () => {
  function isStaleByAge(lastReviewedAt: string, intervalDays: number, now = Date.now()): boolean {
    return (now - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24) > intervalDays;
  }
  it("flags as stale when older than interval", () => {
    const old = new Date(Date.now() - 100 * 86400_000).toISOString();
    expect(isStaleByAge(old, 30)).toBe(true);
  });
  it("does not flag within interval", () => {
    const recent = new Date(Date.now() - 10 * 86400_000).toISOString();
    expect(isStaleByAge(recent, 30)).toBe(false);
  });
});
