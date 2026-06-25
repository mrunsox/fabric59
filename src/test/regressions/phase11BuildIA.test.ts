/**
 * Phase 11 — IA reorder regression.
 *
 * Locks the Build group order to Clients → Campaigns → Workspace guide → Library
 * and confirms Forms is demoted out of the primary sidebar (route stays mounted).
 */
import { describe, it, expect } from "vitest";
import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_DEMOTED,
} from "@/config/canonicalNav";

describe("Phase 11 — Build group IA reorder", () => {
  const build = WORKSPACE_NAV_GROUPS.find((g) => g.label === "Build");

  it("Build group exists", () => {
    expect(build).toBeTruthy();
  });

  it("Build items are ordered Clients → Campaigns → Workspace guide → Library", () => {
    expect(build!.items.map((i) => i.key)).toEqual([
      "clients",
      "campaigns",
      "guide",
      "library",
    ]);
  });

  it("Forms is demoted out of the primary sidebar", () => {
    const buildKeys = build!.items.map((i) => i.key);
    expect(buildKeys).not.toContain("forms");
    expect(WORKSPACE_NAV_DEMOTED.map((i) => i.key)).toContain("forms");
  });
});
