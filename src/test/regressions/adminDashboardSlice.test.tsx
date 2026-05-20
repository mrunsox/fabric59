import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Admin dashboard slice — data correctness + workspace launchpad.
 *
 * Static-source regression locks for the /admin slice:
 *   1. SystemHealthStrip scopes the agents count by organization_id and no
 *      longer renders a hardcoded "OK" webhook tile.
 *   2. ConnectorsReportsPanel shows an actionable empty CTA when an org
 *      has zero connectors.
 *   3. WorkspaceLaunchpad exists, links into all four canonical workspace
 *      surfaces (forms/guides/campaigns/agent), and reuses the
 *      `lastWorkspaceId` localStorage key consumed by useActiveWorkspaceId.
 *   4. OverviewPage renders the "No clients yet" empty state path.
 *   5. WorkspacesPage cards deep-link into the workspace shell.
 *   6. NotificationsPage gates the error_alerts table behind isMasterAdmin.
 */

const read = (rel: string) =>
  readFileSync(resolve(__dirname, "../../..", rel), "utf8");

describe("admin dashboard slice — SystemHealthStrip", () => {
  const src = read("src/components/dashboard/SystemHealthStrip.tsx");

  it("scopes the active-agents query by organization_id", () => {
    expect(src).toMatch(/from\("agents"\)[^;]*\.eq\("organization_id"/s);
  });

  it("removes the hardcoded webhook OK tile", () => {
    expect(src).not.toMatch(/value:\s*"OK"/);
    expect(src).toMatch(/Webhook health/);
  });

  it("derives webhook tone from event traffic, not a constant", () => {
    expect(src).toMatch(/failedEvents\s*>\s*0/);
    expect(src).toMatch(/recentEvents\s*>\s*0/);
  });
});

describe("admin dashboard slice — ConnectorsReportsPanel", () => {
  const src = read("src/components/dashboard/ConnectorsReportsPanel.tsx");

  it("renders an empty-state CTA for orgs with zero connectors", () => {
    expect(src).toMatch(/connectors-empty-state/);
    expect(src).toMatch(/Connect first integration/);
  });

  it("wraps header actions for narrow widths", () => {
    expect(src).toMatch(/flex-wrap/);
  });
});

describe("admin dashboard slice — WorkspaceLaunchpad", () => {
  const src = read("src/components/dashboard/WorkspaceLaunchpad.tsx");

  it("deep-links to the four canonical workspace surfaces", () => {
    // Template literals all derive from the same `${base}` so we assert each
    // canonical surface path appears in the file.
    expect(src).toMatch(/\$\{base\}\/forms/);
    expect(src).toMatch(/\$\{base\}\/guides/);
    expect(src).toMatch(/\$\{base\}\/campaigns/);
    // Agent Cockpit canonical route is /w/:workspaceId/agent (singular).
    expect(src).toMatch(/\$\{base\}\/agent\b/);
  });

  it("reuses the lastWorkspaceId localStorage key", () => {
    expect(src).toMatch(/lastWorkspaceId/);
    // No second key introduced.
    expect(src).not.toMatch(/activeWorkspaceId/);
  });

  it("is mounted on OverviewPage above SystemHealthStrip", () => {
    const overview = read("src/pages/admin/OverviewPage.tsx");
    expect(overview).toMatch(/<WorkspaceLaunchpad/);
    const launchpadIdx = overview.indexOf("<WorkspaceLaunchpad");
    const healthIdx = overview.indexOf("<SystemHealthStrip");
    expect(launchpadIdx).toBeGreaterThan(-1);
    expect(healthIdx).toBeGreaterThan(launchpadIdx);
  });
});

describe("admin dashboard slice — OverviewPage readiness", () => {
  const src = read("src/pages/admin/OverviewPage.tsx");

  it("renders an honest empty state when the org has no clients", () => {
    expect(src).toMatch(/No clients yet/);
    expect(src).toMatch(/hasClient === false/);
    expect(src).toMatch(/\/admin\/clients/);
  });
});

describe("admin dashboard slice — WorkspacesPage deep links", () => {
  const src = read("src/pages/admin/WorkspacesPage.tsx");

  it("exposes Open workspace + Forms/Guides/Campaigns/Agent on each card", () => {
    expect(src).toMatch(/Open workspace/);
    expect(src).toMatch(/\$\{base\}\/forms/);
    expect(src).toMatch(/\$\{base\}\/guides/);
    expect(src).toMatch(/\$\{base\}\/campaigns/);
    expect(src).toMatch(/\$\{base\}\/agent\b/);
  });
});

describe("admin dashboard slice — NotificationsPage org-scope honesty", () => {
  const src = read("src/pages/admin/NotificationsPage.tsx");

  it("gates the error_alerts surface behind isMasterAdmin", () => {
    expect(src).toMatch(/isMasterAdmin/);
    expect(src).toMatch(/error-alerts-restricted/);
  });

  it("disables the error_alerts query for non-master users", () => {
    expect(src).toMatch(/useErrorAlerts\(isMasterAdmin\)/);
  });
});
