/**
 * Phase 7 — Pure-logic tests for clustering helpers used by bb-gap-cluster.
 *
 * The edge function is Deno and not executed here. These tests re-implement
 * the small pure helpers (cosine, normalization, overflow selection) and
 * assert their behavior to lock in expected semantics:
 *   - similar queries cluster into the same topic above threshold
 *   - dissimilar queries spawn new topics
 *   - overflow pruning picks lowest open_event_count first, then oldest
 */
import { describe, expect, it } from "vitest";

const SIM_THRESHOLD = 0.85;
const MAX_OPEN_TOPICS = 200;

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

interface Topic {
  id: string;
  open_event_count: number;
  last_seen_at: string;
}

function pickPruneTargets(topics: Topic[], cap = MAX_OPEN_TOPICS): string[] {
  if (topics.length <= cap) return [];
  const sorted = [...topics].sort(
    (a, b) =>
      a.open_event_count - b.open_event_count ||
      a.last_seen_at.localeCompare(b.last_seen_at),
  );
  return sorted.slice(0, topics.length - cap).map((t) => t.id);
}

describe("bbGapClusteringLogic", () => {
  it("normalizes punctuation and casing consistently", () => {
    expect(normalize("What ARE your HOURS??")).toBe("what are your hours");
    expect(normalize("Refund POLICY!!")).toBe("refund policy");
  });

  it("clusters near-identical embeddings above threshold", () => {
    const a = [1, 0.95, 0.1, 0];
    const b = [0.98, 0.97, 0.12, 0.01];
    expect(cosine(a, b)).toBeGreaterThanOrEqual(SIM_THRESHOLD);
  });

  it("splits dissimilar embeddings below threshold", () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(cosine(a, b)).toBeLessThan(SIM_THRESHOLD);
  });

  it("prunes lowest event count first, then oldest, when over cap", () => {
    const topics: Topic[] = [];
    for (let i = 0; i < MAX_OPEN_TOPICS + 3; i++) {
      topics.push({
        id: `t${i}`,
        open_event_count: i === 0 ? 1 : i === 1 ? 1 : 10 + i,
        last_seen_at: new Date(2026, 0, i + 1).toISOString(),
      });
    }
    const targets = pickPruneTargets(topics);
    expect(targets).toHaveLength(3);
    // t0 and t1 (lowest counts, oldest dates) must be pruned.
    expect(targets).toContain("t0");
    expect(targets).toContain("t1");
  });

  it("returns empty prune list when at or under cap", () => {
    const topics: Topic[] = Array.from({ length: MAX_OPEN_TOPICS }, (_, i) => ({
      id: `t${i}`,
      open_event_count: 1,
      last_seen_at: new Date().toISOString(),
    }));
    expect(pickPruneTargets(topics)).toEqual([]);
  });
});
