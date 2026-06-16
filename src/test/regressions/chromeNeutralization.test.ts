import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Phase 2 Fabric59 reposition — locks the industry-agnostic chrome pass.
 *
 * Scans the in-app chrome (app shell, workspace pages, onboarding, admin
 * surfaces, superadmin surfaces) for legal-only framing that snuck back in.
 *
 * Allowed legal vocabulary stays scoped to:
 *   - src/components/legal-connect/**         (legal product surface)
 *   - src/data/legal-*                         (legal starter templates)
 *   - src/lib/legal-connect/**                 (legal lib)
 *   - src/pages/marketing/**                   (marketing — Phase 3)
 *   - prompts/**                               (prompt corpus)
 *   - src/test/**                              (this file etc.)
 *
 * The /admin/connectors catalog and /w/:workspaceId/integrations catalog
 * are allowed to render the literal heading "Legal practice management"
 * because that is the canonical vertical-pack label — see allowlist below.
 */

const ROOT = resolve(process.cwd(), "src");

const EXCLUDE_PREFIXES = [
  "src/components/legal-connect/",
  "src/data/legal-",
  "src/lib/legal-connect/",
  "src/pages/marketing/",
  "src/test/",
  // Phase 4 — workspace guide template registry; legal vocabulary is allowed
  // here because it only seeds the "Legal firm starter" template content.
  "src/lib/workspace-guide/templates.ts",
  // Phase 5 — campaign-flow template registry; legal vocabulary is allowed
  // here because it only seeds the "Legal intake starter" template content.
  "src/lib/campaign-flow/templates.ts",
  // Vertical Skin System (Phase 2) — per-vertical skin packs are canonical
  // vertical metadata; legal vocabulary in the legal pack description is
  // intentional and not generic chrome.
  "src/lib/skins/packs/",
  // Vertical Skin System (Phase 5) — copy preset registry holds vertical-aware
  // greetings/transfer lines; legal-specific phrasing here is intentional.
  "src/lib/skins/copyPresets.ts",
];

// Files where the literal phrase "Legal practice management" is canonical
// vertical-pack chrome — not a generic "this app is only for law firms" claim.
const VERTICAL_PACK_ALLOWLIST = new Set([
  "src/pages/admin/ConnectorsCatalogPage.tsx",
  "src/pages/workspace/WorkspaceIntegrationsPage.tsx",
  "src/components/onboarding/ClientOnboardingFlow.tsx", // MyCase description
]);

const FORBIDDEN_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "law firm", re: /\blaw\s*firms?\b/i },
  { label: "law-firm", re: /\blaw-firms?\b/i },
  { label: "law practice", re: /\blaw\s+practice\b/i },
  { label: "attorneys/lawyers (generic chrome)", re: /\b(attorneys?|lawyers?)\b/i },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const ALL_FILES = walk(ROOT).map((abs) => abs.replace(resolve(process.cwd()) + "/", ""));

const CHROME_FILES = ALL_FILES.filter(
  (rel) => !EXCLUDE_PREFIXES.some((p) => rel.startsWith(p)),
);

describe("Phase 2 chrome neutralization · Fabric59 reposition", () => {
  for (const { label, re } of FORBIDDEN_PATTERNS) {
    it(`no chrome file contains the phrase "${label}"`, () => {
      const offenders: { file: string; line: number; text: string }[] = [];
      for (const rel of CHROME_FILES) {
        const src = readFileSync(rel, "utf8");
        const lines = src.split("\n");
        lines.forEach((line, i) => {
          if (re.test(line)) offenders.push({ file: rel, line: i + 1, text: line.trim() });
        });
      }
      expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
    });
  }

  it('"Legal practice management" only appears in vertical-pack catalog surfaces', () => {
    const phrase = /Legal practice management/;
    const offenders: string[] = [];
    for (const rel of CHROME_FILES) {
      if (VERTICAL_PACK_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(rel, "utf8");
      if (phrase.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("admin connector catalog groups legal connectors under the vertical-pack header", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/pages/admin/ConnectorsCatalogPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Legal practice management/);
    expect(src).toMatch(/More integration packs coming/);
    expect(src).toMatch(/Clio/);
    expect(src).toMatch(/MyCase/);
    expect(src).toMatch(/Smokeball/);
  });

  it("workspace integrations page renders the legal pack header and placeholder", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/pages/workspace/WorkspaceIntegrationsPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Legal practice management/);
    expect(src).toMatch(/More integration packs coming/);
  });
});
