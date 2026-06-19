/**
 * Phase 1 — ASC side panel dead-end repair.
 *
 * The Preview / Why / History tabs used to render bare placeholder
 * sentences. They now render `BbStateBlock kind="upcoming"` with explicit
 * surface-specific copy, so reviewers don't read placeholders as broken.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("AscSidePanel — Phase 1 dead-end repair", () => {
  const source = readFileSync(
    resolve(__dirname, "../../components/asc/AscSidePanel.tsx"),
    "utf8",
  );

  it("imports the shared BbStateBlock", () => {
    expect(source).toMatch(
      /from "@\/components\/business-brain\/BbStateBlock"/,
    );
  });

  it("renders a BbStateBlock inside each placeholder tab", () => {
    expect(source).toMatch(/data-testid="asc-side-preview-empty"/);
    expect(source).toMatch(/data-testid="asc-side-rationale-empty"/);
    expect(source).toMatch(/data-testid="asc-side-history-empty"/);
  });

  it("uses the upcoming state for placeholder tabs (not bare <p>)", () => {
    // Each placeholder block uses kind="upcoming".
    const matches = source.match(/kind="upcoming"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
