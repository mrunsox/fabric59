import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SUPERADMIN_SECTIONS } from "@/config/superadmin-navigation";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("superadmin surface — canonical cleanup", () => {
  const keys = SUPERADMIN_SECTIONS.map((s) => s.key);

  it("surfaces exactly the 6 canonical sections in order", () => {
    expect(keys).toEqual([
      "overview",
      "workspaces",
      "users",
      "design-partners",
      "legal-connect-reports",
      "docs",
    ]);
  });

  it("does not surface de-surfaced internal tooling", () => {
    for (const banned of ["vault", "exports", "routes", "dev-guide", "test-cases", "call-flow"]) {
      expect(keys).not.toContain(banned);
    }
  });

  it("every surfaced href is mounted as a non-redirect /superadmin route", () => {
    const app = read("src/App.tsx");
    for (const s of SUPERADMIN_SECTIONS) {
      const subpath = s.href.replace(/^\/superadmin\/?/, "");
      // Index route for the bare /superadmin entry.
      const pattern = subpath === ""
        ? /<Route\s+index\s+element=\{<SuperadminOverviewPage/
        : new RegExp(`<Route\\s+path="${subpath}"\\s+element=\\{<(?!Navigate)`);
      expect(app, `route for ${s.href}`).toMatch(pattern);
    }
  });

  it("SystemDocsPage no longer points at legacy /admin/docs or /admin/kb", () => {
    const src = read("src/pages/superadmin/SystemDocsPage.tsx");
    expect(src).not.toMatch(/\/admin\/docs/);
    expect(src).not.toMatch(/\/admin\/kb/);
  });

  it("SuperadminOverviewPage is platform-governance (no vault stats/CTAs)", () => {
    const src = read("src/pages/superadmin/SuperadminOverviewPage.tsx");
    expect(src).not.toMatch(/vault_features/);
    expect(src).not.toMatch(/vault_exports/);
    expect(src).not.toMatch(/Feature Vault/);
  });
});
