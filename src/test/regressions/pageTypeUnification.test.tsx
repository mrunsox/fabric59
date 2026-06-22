import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORKSPACE_NAV } from "@/config/canonicalNav";

/**
 * Phase 3 — Library shell & page-type primitive regression.
 *
 * Locks in:
 *  - The `library` nav entry points at `library` (not the Phase 1
 *    virtual `guides` alias).
 *  - `/w/:workspaceId/library` is registered in App.tsx and renders
 *    WorkspaceLibraryPage.
 *  - The page-type primitives barrel exports the canonical set.
 *  - Standalone `/guides` and `/templates` routes remain mounted
 *    (back-compat / deep links).
 */

const APP_TSX = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const PAGE_TYPES_INDEX = readFileSync(
  resolve(__dirname, "../../components/workspace/page-types/index.ts"),
  "utf8",
);

describe("Phase 3 — Library shell & page-type primitives", () => {
  it("library nav points at /library (Phase 3 real route, not the Phase 1 alias)", () => {
    const library = WORKSPACE_NAV.find((n) => n.key === "library");
    expect(library).toBeDefined();
    expect(library?.to).toBe("library");
  });

  it("library route is mounted with WorkspaceLibraryPage", () => {
    expect(APP_TSX).toMatch(/path="library"\s+element=\{<WorkspaceLibraryPage/);
    expect(APP_TSX).toMatch(
      /import WorkspaceLibraryPage from "@\/pages\/workspace\/library\/WorkspaceLibraryPage"/,
    );
  });

  it("standalone /guides and /templates remain mounted for back-compat", () => {
    expect(APP_TSX).toMatch(/path="guides"\s+element=\{<WorkspaceGuidesPage/);
    expect(APP_TSX).toMatch(/path="templates"\s+element=\{<WorkspaceTemplatesPage/);
  });

  it("page-type primitives barrel exports the canonical five", () => {
    for (const name of ["ListPage", "DetailPage", "BuilderPage", "ConfigPage", "LogPage"]) {
      expect(PAGE_TYPES_INDEX).toContain(name);
    }
  });
});
