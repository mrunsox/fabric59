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

// Phase 5 governance modules must remain inside Business Brain code paths.
// ASC, runner, and search modules must not import them.
const GOVERNANCE_SYMBOLS = [
  "BrainGovernancePage",
  "BbConflictDrawer",
  "BbStaleFactDrawer",
  "listConflicts",
  "resolveConflict",
  "markFactReviewed",
  "markFactNeedsUpdate",
  "triggerGovernanceSweep",
];

const FORBIDDEN_DIRS = [
  join(ROOT, "components/asc"),
  join(ROOT, "pages/workspace/campaigns/asc"),
  join(ROOT, "pages/agent"),
  join(ROOT, "components/call-runner"),
];

describe("bbGovernanceBoundary", () => {
  it("ASC and runner code does not import governance modules", () => {
    const violations: string[] = [];
    for (const dir of FORBIDDEN_DIRS) {
      let files: string[] = [];
      try { files = walk(dir); } catch { continue; }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        for (const sym of GOVERNANCE_SYMBOLS) {
          if (new RegExp(`\\b${sym}\\b`).test(src)) {
            violations.push(`${f} mentions ${sym}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
