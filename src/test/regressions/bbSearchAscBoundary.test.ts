/**
 * Business Brain ↔ ASC boundary — Phase 3 reinforcement.
 *
 * Phase 3 introduces semantic search inside the Business Brain module. The
 * retrieval surface (`searchApprovedKnowledge`, `triggerBbBackfill`,
 * `BbSourceCard`, `BrainSearchPage`) is for operator/admin use within the
 * Business Brain UI ONLY. ASC must not import any of them — there is no
 * retrieval inside ASC in this phase.
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

describe("BB Phase 3 — ASC never imports retrieval/search APIs", () => {
  it("ASC code does not import searchApprovedKnowledge, triggerBbBackfill, BbSourceCard, or BrainSearchPage", () => {
    const ascDirs = [
      "src/lib/asc",
      "src/pages/workspace/campaigns/asc",
      "src/components/asc",
    ];
    const forbidden = [
      /searchApprovedKnowledge/,
      /triggerBbBackfill/,
      /@\/components\/business-brain\//,
      /BrainSearchPage/,
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
});
