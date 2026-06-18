/**
 * Phase 7 — Boundary regression for demand-driven gap detection.
 *
 * ASC and live-runner code may import the small `gapLogging` helper (logging
 * only; no governance surface). They must NOT import governance-side gap
 * selectors, the governance section component, or the cluster trigger.
 */
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

const FORBIDDEN_GOVERNANCE_SYMBOLS = [
  "BrainGapGovernanceSection",
  "listGapTopics",
  "dismissGapTopic",
  "suppressGapTopic",
  "linkGapTopicToFact",
  "triggerGapClusterRun",
  "buildFactDraftLinkFromGap",
];

const FORBIDDEN_DIRS = [
  join(ROOT, "components/asc"),
  join(ROOT, "pages/workspace/campaigns/asc"),
  join(ROOT, "pages/agent"),
  join(ROOT, "components/call-runner"),
];

describe("bbGapBoundary", () => {
  it("ASC and runner code does not import governance-side gap modules", () => {
    const violations: string[] = [];
    for (const dir of FORBIDDEN_DIRS) {
      let files: string[] = [];
      try {
        files = walk(dir);
      } catch {
        continue;
      }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        for (const sym of FORBIDDEN_GOVERNANCE_SYMBOLS) {
          if (new RegExp(`\\b${sym}\\b`).test(src)) {
            violations.push(`${f} mentions ${sym}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
