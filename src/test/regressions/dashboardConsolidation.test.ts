import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Dashboard consolidation guard.
 *
 * Locks in the canonical hierarchy after the consolidation pass:
 *   - Five9 Overview, Monitoring Hub, Testing Hub page files deleted.
 *   - Legacy /admin/campaigns/:id demoted behind AdminCampaignRedirect.
 *   - /admin/five9/overview, /admin/monitoring, /admin/testing tombstoned
 *     to canonical destinations.
 *   - No first-class workspace "home" links remain in product chrome.
 *   - No first-class CTA links into /admin/campaigns/:id (only the
 *     redirect helper itself may reference the path).
 */

const ROOT = resolve(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("Dashboard consolidation · retired page files", () => {
  const retired = [
    "pages/admin/Five9OverviewPage.tsx",
    "pages/admin/MonitoringHubPage.tsx",
    "pages/admin/TestingHubPage.tsx",
    "pages/admin/CampaignDetailPage.tsx",
  ];

  for (const rel of retired) {
    it(`${rel} is deleted on disk`, () => {
      expect(existsSync(join(ROOT, rel))).toBe(false);
    });
  }
});

describe("Dashboard consolidation · App.tsx tombstones", () => {
  const app = read("App.tsx");

  it("/admin/five9/overview tombstones to /admin/connectors/five9", () => {
    expect(app).toMatch(
      /<Route\s+path="five9\/overview"\s+element=\{<Navigate\s+to="\/admin\/connectors\/five9"\s+replace\s*\/>\}/,
    );
  });

  it("/admin/monitoring tombstones to /admin/logs", () => {
    expect(app).toMatch(
      /<Route\s+path="monitoring"\s+element=\{<Navigate\s+to="\/admin\/logs"\s+replace\s*\/>\}/,
    );
  });

  it("/admin/testing tombstones to /admin/test", () => {
    expect(app).toMatch(
      /<Route\s+path="testing"\s+element=\{<Navigate\s+to="\/admin\/test"\s+replace\s*\/>\}/,
    );
  });

  it("/admin/campaigns/:id is demoted behind AdminCampaignRedirect", () => {
    expect(app).toMatch(
      /<Route\s+path="campaigns\/:id"\s+element=\{<AdminCampaignRedirect\s*\/>\}/,
    );
    expect(app).toMatch(/from\s+"@\/components\/auth\/AdminCampaignRedirect"/);
    expect(app, "legacy CampaignDetailPage import must be gone").not.toMatch(
      /from\s+"@\/pages\/admin\/CampaignDetailPage"/,
    );
  });

  it("does not import any retired hub page modules", () => {
    for (const sym of ["Five9OverviewPage", "MonitoringHubPage", "TestingHubPage"]) {
      expect(app, `${sym} must not be imported`).not.toMatch(
        new RegExp(`^import\\s+(?:\\{\\s*)?${sym}\\b`, "m"),
      );
    }
  });
});

describe("Dashboard consolidation · workspace home retired from UX", () => {
  const productFiles = walk(ROOT).filter(
    (f) =>
      !f.includes(`${ROOT}/test/`) &&
      !f.includes("OutlinePage.tsx") &&
      !f.includes("LegacyWorkspaceRedirect.tsx") && // tail fallback comment only
      !f.includes("WorkspaceShell.tsx") && // contains intentional comments + redirect mount
      !f.endsWith("dashboardConsolidation.test.ts"),
  );

  it("no product chrome links to /w/:id/home", () => {
    const offenders: string[] = [];
    for (const file of productFiles) {
      const src = readFileSync(file, "utf8");
      if (/\/w\/[^"`]*\/home["'`]/.test(src) || /\$\{[^}]+\}\/home["'`]/.test(src)) {
        offenders.push(file.replace(ROOT + "/", ""));
      }
    }
    expect(offenders, `Files still linking to /w/:id/home:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("Dashboard consolidation · admin campaign legacy demoted", () => {
  const productFiles = walk(ROOT).filter(
    (f) =>
      !f.includes(`${ROOT}/test/`) &&
      !f.includes("OutlinePage.tsx") &&
      !f.includes("surfaceAudit.ts") &&
      !f.includes("AdminCampaignRedirect.tsx") &&
      !f.endsWith("dashboardConsolidation.test.ts"),
  );

  it("no first-class link target points at /admin/campaigns/:id", () => {
    // Allow comments + /admin/campaigns/new + edit/* + readiness/event-log; flag bare ${id}/${var} links.
    const offenders: string[] = [];
    const linkRe =
      /(?:to|href)\s*[=:]\s*[`"']\/admin\/campaigns\/\$\{[^}]+\}[`"']/;
    for (const file of productFiles) {
      const src = readFileSync(file, "utf8");
      if (linkRe.test(src)) offenders.push(file.replace(ROOT + "/", ""));
    }
    expect(
      offenders,
      `Surfaces still linking to /admin/campaigns/:id:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
