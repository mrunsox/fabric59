import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

// Phase 6 — vertical modules must stay inside Business Brain.
const VERTICAL_SYMBOLS = [
  "BrainVerticalGovernanceSection",
  "BbGapDrawer",
  "getWorkspaceVerticalProfile",
  "getVerticalCoverageSummary",
  "listVerticalGaps",
  "suppressVerticalGap",
  "triggerVerticalEvaluation",
];

const FORBIDDEN_DIRS = [
  join(ROOT, "components/asc"),
  join(ROOT, "pages/workspace/campaigns/asc"),
  join(ROOT, "pages/agent"),
  join(ROOT, "components/call-runner"),
  join(ROOT, "hooks/useAsc"),
];

describe("bbVerticalBoundary", () => {
  it("ASC and runner code does not import vertical modules", () => {
    const violations: string[] = [];
    for (const dir of FORBIDDEN_DIRS) {
      let files: string[] = [];
      try { files = walk(dir); } catch { continue; }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        for (const sym of VERTICAL_SYMBOLS) {
          if (new RegExp(`\\b${sym}\\b`).test(src)) {
            violations.push(`${f} mentions ${sym}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
