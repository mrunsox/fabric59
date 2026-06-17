/**
 * Business Brain — bridge boundary invariant (Slice 1).
 *
 * Downstream consumers (ASC, canonical, agent workspace) may import only
 * from `@/lib/business-brain/selectors`. They MUST NOT import:
 *   - `@/lib/business-brain/types` (raw enum/payload contracts)
 *   - `@/hooks/useBusinessBrain` (table row types + DB hooks)
 *   - `@/pages/workspace/brain/*`
 *
 * This scan runs over the directories that own downstream consumers.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const CONSUMER_DIRS = [
  "src/lib/asc",
  "src/pages/workspace/campaigns/asc",
  "src/components/asc",
  "src/components/campaigns",
  "src/lib/campaign-flow",
  "src/lib/campaign-publish",
];

const FORBIDDEN_PATTERNS = [
  /@\/hooks\/useBusinessBrain/,
  /@\/pages\/workspace\/brain/,
  /@\/lib\/business-brain\/types/,
  /@\/lib\/business-brain\/entitySchemas/,
  /@\/lib\/business-brain\/promotion/,
  /@\/lib\/business-brain\/telemetry/,
  /@\/lib\/business-brain\/flagResolver/,
];

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry}`;
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

describe("Business Brain — bridge boundary", () => {
  it("downstream consumer modules import only from @/lib/business-brain/selectors", () => {
    const offenders: string[] = [];
    for (const dir of CONSUMER_DIRS) {
      for (const file of walk(dir)) {
        const src = readFileSync(join(ROOT, file), "utf8");
        for (const pat of FORBIDDEN_PATTERNS) {
          if (pat.test(src)) {
            offenders.push(`${file} :: ${pat}`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
