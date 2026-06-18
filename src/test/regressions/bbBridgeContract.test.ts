/**
 * Phase 8 — Bridge contract test.
 *
 * Enforces the dependency policy introduced in Phase 8:
 *
 *   - ASC code may import only from `@/lib/business-brain/bridge/asc`
 *     (and incidentally `bridge/core` for type primitives). It must not
 *     reach into other bridge submodules, raw `bb_*` table queries, or
 *     internal Brain pages/hooks.
 *
 *   - Runner / Live Assist code may import only from `bridge/assist`
 *     (and `bridge/core`). Same restrictions otherwise.
 *
 *   - No module outside `src/lib/business-brain/**` or
 *     `supabase/functions/**` may execute a `.from("bb_*"...)` query
 *     directly; raw table access stays inside the Brain internals.
 *
 * Backwards compatibility: legacy `selectors.ts` imports are still
 * permitted in this phase — the bridge becomes the preferred surface
 * but selectors are not yet deprecated.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir: string, files: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

const ASC_DIRS = [
  join(SRC, "components/asc"),
  join(SRC, "pages/workspace/campaigns/asc"),
];
const RUNNER_DIRS = [
  join(SRC, "pages/agent"),
  join(SRC, "components/call-runner"),
];

// Forbidden imports for ASC: any bridge module other than asc/core.
const ASC_FORBIDDEN_BRIDGES = ["assist", "search", "governance"];
const RUNNER_FORBIDDEN_BRIDGES = ["asc", "search", "governance"];

describe("Phase 8 — bridge contract", () => {
  it("ASC code does not cross into non-asc bridge submodules", () => {
    const offenders: string[] = [];
    for (const dir of ASC_DIRS) {
      for (const f of walk(dir)) {
        const src = readFileSync(f, "utf8");
        for (const b of ASC_FORBIDDEN_BRIDGES) {
          const pat = new RegExp(`@/lib/business-brain/bridge/${b}\\b`);
          if (pat.test(src)) offenders.push(`${f} imports bridge/${b}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("runner/assist code does not cross into non-assist bridge submodules", () => {
    const offenders: string[] = [];
    for (const dir of RUNNER_DIRS) {
      for (const f of walk(dir)) {
        const src = readFileSync(f, "utf8");
        for (const b of RUNNER_FORBIDDEN_BRIDGES) {
          const pat = new RegExp(`@/lib/business-brain/bridge/${b}\\b`);
          if (pat.test(src)) offenders.push(`${f} imports bridge/${b}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("no module outside Brain internals queries raw bb_* tables", () => {
    const allowedPrefix = [
      join(SRC, "lib/business-brain"),
      join(SRC, "hooks/useBusinessBrain"),
      join(SRC, "pages/workspace/brain"),
      join(SRC, "pages/workspace/settings/BusinessBrainSettingsPage"),
      join(SRC, "components/business-brain"),
    ];
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (allowedPrefix.some((p) => f.startsWith(p))) continue;
      const src = readFileSync(f, "utf8");
      // Match patterns like .from("bb_facts" or .from('bb_gap_topics'
      if (/\.from\(\s*["'`]bb_[a-z_]+/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("bridge re-exports are backward compatible with legacy selectors", async () => {
    const core = await import("@/lib/business-brain/bridge/core");
    const sel = await import("@/lib/business-brain/selectors");
    expect(typeof core.listApprovedFacts).toBe("function");
    expect(core.listApprovedFacts).toBe(sel.listApprovedFacts);
    expect(core.buildBbFactDeepLink).toBe(sel.buildBbFactDeepLink);
  });
});
