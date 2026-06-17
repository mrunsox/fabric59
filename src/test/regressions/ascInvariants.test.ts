/**
 * Phase 6 · Slice 1 — Invariant guardrails.
 *
 * Lightweight regex-based scans that protect the ASC ↔ canonical boundary
 * from accidental coupling. See docs/asc-architecture.md.
 *
 * Invariants protected here:
 *   - I1: ASC reducer's ALLOWED_WHEN_FORKED is the post-fork guard and
 *         contains exactly the expected lifecycle/nav actions.
 *   - I4: ASC-local modules (`@/lib/asc/*`) are not imported by canonical
 *         runtime modules outside the translator boundary.
 *   - I5: ASC modules never import the canonical publish/save hook.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_WHEN_FORKED } from "@/lib/asc/reducer";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

describe("ASC invariants (Phase 6 · Slice 1)", () => {
  describe("I1 — post-fork reducer guard allowlist", () => {
    const EXPECTED_ALLOWED = new Set([
      "INIT_DRAFT",
      "RESET_DRAFT",
      "SET_STEP",
      "TOUCH",
      "MARK_FORKED",
    ]);

    // A pinned list of known mutating actions that MUST NOT be in the
    // post-fork allowlist. If a new mutating action is added in the future,
    // it must also be excluded — extend this list intentionally.
    const KNOWN_MUTATING = [
      "UPDATE_BUSINESS",
      "UPDATE_PURPOSE",
      "ADD_CALLER_REASON",
      "UPDATE_CALLER_REASON",
      "REMOVE_CALLER_REASON",
      "SET_DESTINATION",
      "SET_LAUNCH",
      "MARK_STEP_STATUS",
      "APPLY_INTERVIEWER_TURN",
      "CONFIRM_PROPOSED_FIELD",
      "REJECT_PROPOSED_FIELD",
      "APPLY_GAP_FINDER_RESULT",
      "DISMISS_GAP_ITEM",
      "ADD_OUTCOME_EDIT",
      "UPDATE_OUTCOME_EDIT",
      "REMOVE_OUTCOME_EDIT",
      "ADD_NOTIFICATION_EDIT",
      "UPDATE_NOTIFICATION_EDIT",
      "REMOVE_NOTIFICATION_EDIT",
      "APPLY_LOGIC_ARCHITECT_RESULT",
      "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      "REJECT_LOGIC_ARCHITECT_PROPOSAL",
      "EDIT_LOGIC_ARCHITECT_PROPOSAL",
      "BEGIN_STEP8_GENERATION",
      "APPLY_STEP8_GENERATION",
      "FAIL_STEP8_GENERATION",
      "DISCARD_STEP8_GENERATION",
    ];

    it("exposes ALLOWED_WHEN_FORKED with exactly the expected entries", () => {
      const actual = new Set(ALLOWED_WHEN_FORKED);
      expect(actual).toEqual(EXPECTED_ALLOWED);
    });

    it("excludes every known mutating action", () => {
      for (const t of KNOWN_MUTATING) {
        expect(
          ALLOWED_WHEN_FORKED.has(t as never),
          `mutating action "${t}" must not be in ALLOWED_WHEN_FORKED`,
        ).toBe(false);
      }
    });

    it("reducer applies the guard before dispatch", () => {
      const src = read("src/lib/asc/reducer.ts");
      // The guard must check forked state AND consult the allowlist.
      expect(src).toMatch(/state\.state\s*===\s*"forked"/);
      expect(src).toMatch(/ALLOWED_WHEN_FORKED\.has\(action\.type\)/);
    });
  });

  describe("I4 — canonical runtime never imports ASC-local modules", () => {
    // Canonical runtime files that must NOT depend on `@/lib/asc/*` (except
    // for type-only ascOrigin shapes which live in `@/types/campaign`).
    const CANONICAL_RUNTIME_FILES = [
      "src/pages/admin/CampaignIntakePage.tsx",
      "src/components/campaigns/AscOriginPanel.tsx",
      "src/hooks/useCampaignSetup.ts",
    ];

    it("none of the pinned canonical files import @/lib/asc/*", () => {
      for (const file of CANONICAL_RUNTIME_FILES) {
        const src = read(file);
        const matches = src.match(/from\s+["']@\/lib\/asc\/[^"']+["']/g) ?? [];
        expect(
          matches,
          `${file} must not import from @/lib/asc/* — found: ${matches.join(", ")}`,
        ).toEqual([]);
        // Also catch relative paths into the asc dir.
        expect(src).not.toMatch(/from\s+["'][./]+lib\/asc\//);
      }
    });
  });

  describe("I5 — ASC modules never import the canonical publish path", () => {
    // Symbols that constitute the canonical publish/save surface.
    const FORBIDDEN_SYMBOLS = [
      "useSaveCampaignSetup",
      "useAutoProvision",
    ];
    // The hook module those live in.
    const FORBIDDEN_IMPORT_PATH = "@/hooks/useCampaignSetup";

    const ASC_DIRS = [
      "src/lib/asc",
      "src/pages/workspace/campaigns/asc",
      "src/hooks", // narrow to ASC hooks below
    ];

    function ascFiles(): string[] {
      const out: string[] = [];
      walk("src/lib/asc", out);
      walk("src/pages/workspace/campaigns/asc", out);
      // ASC-prefixed hooks only.
      for (const entry of readdirSync(join(ROOT, "src/hooks"))) {
        if (/^useAsc.*\.tsx?$/.test(entry)) out.push(`src/hooks/${entry}`);
      }
      // touch ASC_DIRS so eslint stays happy without changing intent
      void ASC_DIRS;
      return out;
    }

    it("no ASC entrypoint imports the canonical save/publish hook", () => {
      const offenders: string[] = [];
      for (const file of ascFiles()) {
        const src = read(file);
        if (src.includes(FORBIDDEN_IMPORT_PATH)) {
          offenders.push(`${file} imports ${FORBIDDEN_IMPORT_PATH}`);
          continue;
        }
        for (const sym of FORBIDDEN_SYMBOLS) {
          // Match named imports/usages, not coincidental substrings.
          const re = new RegExp(`\\b${sym}\\b`);
          if (re.test(src)) offenders.push(`${file} references ${sym}`);
        }
      }
      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  });
});
