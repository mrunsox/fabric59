import { describe, expect, it } from "vitest";

// Pure helpers mirroring bb-detect-conflicts.
function normalizePhone(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/[^0-9+]/g, "");
  if (!d) return null;
  return d.startsWith("+") ? d : d.replace(/^1?/, "");
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

describe("bb conflicts — phone normalization", () => {
  it("treats formatted variants as equal", () => {
    expect(normalizePhone("(415) 555-1212")).toBe(normalizePhone("415-555-1212"));
  });
  it("flags different numbers as different", () => {
    expect(normalizePhone("415-555-1212")).not.toBe(normalizePhone("415-555-9999"));
  });
});

describe("bb conflicts — similarity thresholds (conservative)", () => {
  it("near-identical vectors score above FAQ threshold (0.88)", () => {
    const a = [1, 0.9, 0.8];
    const b = [1, 0.91, 0.81];
    expect(cosine(a, b)).toBeGreaterThan(0.88);
  });
  it("loosely related vectors score below FAQ threshold", () => {
    const a = [1, 0, 0];
    const b = [0.6, 0.7, 0.3];
    expect(cosine(a, b)).toBeLessThan(0.88);
  });
});
