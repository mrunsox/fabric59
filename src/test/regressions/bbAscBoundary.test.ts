/**
 * Business Brain ↔ ASC boundary regression (Slice 2).
 *
 * Two directions are checked:
 *   1. ASC code (and other downstream consumers) must NOT import from
 *      business-brain internals. (Already covered broadly by
 *      bbBridgeBoundary.test.ts; we re-assert ASC-scoped paths here as a
 *      single-purpose canary.)
 *   2. Business Brain code must NOT import from `@/lib/asc/**` or
 *      `@/pages/workspace/campaigns/asc/**`. The bridge is read-only and
 *      flows one way: downstream → selectors.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  let entries: string[];
  try { entries = readdirSync(abs); } catch { return out; }
  for (const entry of entries) {
    const rel = `${dir}/${entry}`;
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

describe("Business Brain ↔ ASC boundary", () => {
  it("ASC code does not import business-brain internals", () => {
    const ascDirs = [
      "src/lib/asc",
      "src/pages/workspace/campaigns/asc",
    ];
    const forbidden = [
      /@\/hooks\/useBusinessBrain/,
      /@\/pages\/workspace\/brain/,
      /@\/lib\/business-brain\/(?!selectors)/,
      /from\s+["']business-brain\//,
    ];
    const offenders: string[] = [];
    for (const dir of ascDirs) {
      for (const file of walk(dir)) {
        const src = readFileSync(join(ROOT, file), "utf8");
        for (const pat of forbidden) {
          if (pat.test(src)) offenders.push(`${file} :: ${pat}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("business-brain code does not import ASC modules", () => {
    const bbDirs = [
      "src/lib/business-brain",
      "src/hooks", // only the bb hook lives here that we care about
      "src/pages/workspace/brain",
    ];
    // Only inspect files whose name suggests Business Brain ownership.
    // Phase 2: `useBusinessBrainSuggestions` is a BB-owned hook and must
    // also be checked for ASC import leakage in the opposite direction.
    const isBbFile = (rel: string) =>
      rel.startsWith("src/lib/business-brain/") ||
      rel.startsWith("src/pages/workspace/brain/") ||
      /useBusinessBrain/.test(rel);

    const forbidden = [
      /from\s+["']@\/lib\/asc/,
      /from\s+["']@\/pages\/workspace\/campaigns\/asc/,
      /from\s+["']@\/hooks\/useAsc/,
    ];

    const offenders: string[] = [];
    for (const dir of bbDirs) {
      for (const file of walk(dir)) {
        if (!isBbFile(file)) continue;
        const src = readFileSync(join(ROOT, file), "utf8");
        for (const pat of forbidden) {
          if (pat.test(src)) offenders.push(`${file} :: ${pat}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
