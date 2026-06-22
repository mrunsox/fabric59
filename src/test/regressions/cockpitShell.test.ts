import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORKSPACE_NAV } from "@/config/canonicalNav";

/**
 * Phase 4 — Cockpit shell regression.
 *
 * Locks in:
 *  - The `cockpit` nav entry now points at the real `/cockpit` route
 *    (not the Phase 1 `agent` alias).
 *  - `/w/:workspaceId/cockpit` is registered in App.tsx and renders the
 *    WorkspaceCockpitShell.
 *  - Standalone `/agent`, `/runs`, `/supervisor` remain mounted for
 *    back-compat and deep links.
 */

const APP_TSX = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

describe("Phase 4 — Cockpit shell", () => {
  it("cockpit nav points at /cockpit (Phase 4 real route)", () => {
    const cockpit = WORKSPACE_NAV.find((n) => n.key === "cockpit");
    expect(cockpit).toBeDefined();
    expect(cockpit?.to).toBe("cockpit");
  });

  it("cockpit route is mounted with WorkspaceCockpitShell", () => {
    expect(APP_TSX).toMatch(
      /import WorkspaceCockpitShell from "@\/pages\/workspace\/cockpit\/WorkspaceCockpitShell"/,
    );
    expect(APP_TSX).toMatch(/path="cockpit"\s+element=\{<WorkspaceCockpitShell/);
  });

  it("standalone /agent, /runs, /supervisor remain mounted for back-compat", () => {
    expect(APP_TSX).toMatch(/path="agent"\s+element=\{<WorkspaceAgentCockpitPage/);
    expect(APP_TSX).toMatch(/path="runs"\s+element=\{<WorkspaceRunsPage/);
    expect(APP_TSX).toMatch(/path="supervisor"\s+element=\{<WorkspaceSupervisorPage/);
  });
});
