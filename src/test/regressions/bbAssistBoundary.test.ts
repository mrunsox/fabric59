/**
 * Phase 4 — boundary regression for Business Brain live runner assist.
 *
 * - The new assist surface (`useBusinessBrainAssist`, `BbAssistPanel`,
 *   `assistContext`, `assistRanker`) is for the LIVE RUNNER ONLY.
 * - ASC code must never import any of these.
 * - The runner is allowed to import the bridge selector
 *   `getAssistFactsForSession`; that is the only path into the assist data.
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

const FORBIDDEN_IN_ASC = [
  /useBusinessBrainAssist/,
  /assistContext/,
  /assistRanker/,
  /BbAssistPanel/,
  /getAssistFactsForSession/,
];

const ASC_DIRS = [
  "src/lib/asc",
  "src/pages/workspace/campaigns/asc",
  "src/components/asc",
];

describe("BB Phase 4 — ASC never imports live runner assist", () => {
  it("ASC code does not reference any assist symbols", () => {
    const offenders: string[] = [];
    for (const dir of ASC_DIRS) {
      for (const file of walk(dir)) {
        const src = readFileSync(join(ROOT, file), "utf8");
        for (const pat of FORBIDDEN_IN_ASC) {
          if (pat.test(src)) offenders.push(`${file} :: ${pat}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
