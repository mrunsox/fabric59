/**
 * Phase 1 — State hygiene across Brain surfaces.
 *
 * Source-level guard rails so later refactors don't reintroduce raw
 * placeholder copy in surfaces that should route through `BbStateBlock` /
 * `BbPermissionDenied`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string) {
  return readFileSync(resolve(__dirname, "../../", rel), "utf8");
}

describe("Phase 1 — state hygiene", () => {
  it("BusinessBrainLayoutPage disabled state uses BbStateBlock, not a code snippet", () => {
    const src = read("pages/workspace/brain/BusinessBrainLayoutPage.tsx");
    expect(src).toMatch(/data-testid="bb-layout-disabled"/);
    expect(src).toMatch(/BbStateBlock/);
    expect(src).not.toMatch(/features\.businessBrain\.enabled<\/code>/);
  });

  it("BusinessBrainSettingsPage non-admin route uses BbPermissionDenied", () => {
    const src = read("pages/workspace/settings/BusinessBrainSettingsPage.tsx");
    expect(src).toMatch(/BbPermissionDenied/);
  });

  it("BrainHealthPage non-admin route uses BbPermissionDenied + freshness stamp", () => {
    const src = read("pages/workspace/brain/BrainHealthPage.tsx");
    expect(src).toMatch(/BbPermissionDenied/);
    expect(src).toMatch(/data-testid="bb-health-freshness"/);
  });

  it("BrainSearchPage no-results gates the propose-fact CTA by permission", () => {
    const src = read("pages/workspace/brain/BrainSearchPage.tsx");
    expect(src).toMatch(/data-testid="bb-search-no-results"/);
    // canReindex is the existing admin gate; propose-fact is rendered only when canReindex is true.
    expect(src).toMatch(/canReindex \?[\s\S]*bb-search-propose-fact/);
    // Softer fallback for non-admins points at Governance.
    expect(src).toMatch(/bb-search-open-governance/);
  });

  it("SuggestedFactsPage empty state offers a forward CTA", () => {
    const src = read("pages/workspace/brain/SuggestedFactsPage.tsx");
    expect(src).toMatch(/data-testid="bb-suggested-empty"/);
    expect(src).toMatch(/data-testid="bb-suggested-next-cta"/);
  });

  it("ApprovedKnowledgePage shows a back-chip when arriving from a gap", () => {
    const src = read("pages/workspace/brain/ApprovedKnowledgePage.tsx");
    expect(src).toMatch(/data-testid="bb-approved-back-from-gap"/);
    expect(src).toMatch(/from=gap:/);
  });

  it("Command palette exposes Brain Settings + Health to admins", () => {
    const src = read("components/workspace/WorkspaceCommandPalette.tsx");
    expect(src).toMatch(/Business Brain/);
    expect(src).toMatch(/settings\/brain/);
    expect(src).toMatch(/brain\/health/);
    expect(src).toMatch(/showBrainAdmin/);
  });
});
