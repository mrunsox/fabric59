import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Canonical surfaces regression — guards against any redirect-only or
 * compatibility-only route appearing in primary nav, shells, dashboards,
 * marketing chrome, breadcrumbs, or quick-action CTAs.
 *
 * Pure static scan (no React render) — keeps the test fast and resilient
 * to provider/auth wiring.
 */

const ROOT = path.resolve(process.cwd(), "src");

/** Files whose link targets are user-visible primary surfaces. */
const SURFACED_FILES = [
  "config/navigation.ts",
  "config/superadmin-navigation.ts",
  "components/layout/AdminShell.tsx",
  "components/layout/WorkspaceShell.tsx",
  "components/layout/SuperadminShell.tsx",
  "components/layout/SectionTabs.tsx",
  "components/marketing/MegaMenuHeader.tsx",
  "components/dashboard/QuickActionsGrid.tsx",
  "components/dashboard/ReadinessChecklist.tsx",
  "components/dashboard/SystemHealthStrip.tsx",
  "components/dashboard/AIGuidanceCard.tsx",
  "pages/workspace/WorkspaceHomePage.tsx",
  "pages/workspace/WorkspacesIndexPage.tsx",
  "pages/admin/OverviewPage.tsx",
  // UserDashboardPage vaulted (slug: legacy-user-dashboard) — body inlined into OverviewPage.
];

/**
 * Routes that are mounted as <Navigate replace> only — must NEVER be linked to
 * from a surfaced CTA. Bookmarks still work because the route file itself
 * issues the redirect, but no user-visible surface should land users here.
 */
const REDIRECT_ONLY = [
  "/dashboard",
  "/admin/dashboard",
  "/admin/integrations",
  "/admin/scripter",
  "/admin/scriptflow",
  "/admin/tree-editor",
  "/admin/call-flow",
  "/admin/tenants",
  "/admin/campaigns/overview",
  "/admin/campaigns/drafts",
  "/admin/campaigns/archived",
  "/admin/campaign-blueprints",
  "/admin/five9/legacy",
  "/admin/dev-guide",
  "/admin/settings/dev-guide",
  "/onboarding/legal-connect",
  "/master",
  "/master/organizations",
  "/master/users",
  "/master/vault",
  "/master/exports",
  "/master/routes",
  "/master/docs",
  "/vault",
  "/feature-vault",
  "/five9",
  "/domains",
  "/five9-domains",
  "/legal-connect",
  "/legal-connect/overview",
  "/settings",
  "/call-flow",
];

/**
 * Routes that are mounted as page bodies but are explicitly de-surfaced from
 * primary nav/CTAs (compatibility-only). They remain reachable via direct URL
 * for ops/deep links — a primary surface linking to them is a regression.
 */
const COMPATIBILITY_ONLY = [
  "/admin/script-routing",
  "/admin/agent-dashboard",
  "/admin/campaigns/readiness",
  "/admin/campaigns/event-log",
  "/admin/five9/campaign-builder",
  "/admin/kb",
  // Workspace compatibility-only sections (de-surfaced in WORKSPACE_SECTIONS).
  // Match as suffix segments because workspace URLs are templated.
  "integrations-legacy",
  "qa-legacy",
  "analytics-legacy",
  "/forms",
  "/runs",
  "/agents",
  "/supervisor",
  "/knowledge",
  "/assistant",
];

/** Extract every routing target (Link/NavLink/Navigate/navigate(...)/nav config href). */
function extractTargets(source: string): string[] {
  const out: string[] = [];
  // to="..." or href="..." with leading slash
  const attr = /(?:to|href)\s*[=:]\s*["'`]([/][^"'`\s${}]+)["'`]/g;
  // navigate("/...") or navigate(`/...`)
  const navStr = /navigate\(\s*["'`]([/][^"'`]+)["'`]/g;
  const navTpl = /navigate\(\s*`([/][^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = attr.exec(source))) out.push(m[1]);
  while ((m = navStr.exec(source))) out.push(m[1]);
  while ((m = navTpl.exec(source))) out.push(m[1].replace(/\$\{[^}]+\}/g, ":param"));
  return out;
}

function loadAllTargets(): { file: string; target: string }[] {
  const all: { file: string; target: string }[] = [];
  for (const rel of SURFACED_FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");
    for (const t of extractTargets(src)) all.push({ file: rel, target: t });
  }
  return all;
}

function strip(target: string): string {
  return target.split(/[?#]/)[0];
}

describe("Canonical surfaces · CTA guard", () => {
  const targets = loadAllTargets();

  it("collects link targets from surfaced files", () => {
    expect(targets.length).toBeGreaterThan(10);
  });

  it("never links to a redirect-only route", () => {
    const violations = targets.filter(({ target }) => {
      const base = strip(target);
      return REDIRECT_ONLY.some((r) => base === r || base.startsWith(r + "/") || base.startsWith(r + "?"));
    });
    expect(
      violations,
      `Surfaced CTAs must not point at redirect-only routes:\n${violations
        .map((v) => `  ${v.target}  ←  ${v.file}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("never links to a compatibility-only route", () => {
    const violations = targets.filter(({ target }) => {
      const base = strip(target);
      return COMPATIBILITY_ONLY.some((r) => {
        if (r.startsWith("/")) return base === r || base.startsWith(r + "/");
        // suffix segment match (workspace-relative compatibility paths)
        return base.endsWith("/" + r) || base.includes("/" + r + "/") || base.endsWith("/" + r + ":param");
      });
    });
    expect(
      violations,
      `Surfaced CTAs must not point at compatibility-only routes:\n${violations
        .map((v) => `  ${v.target}  ←  ${v.file}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("workspace shell secondary nav uses SURFACED_WORKSPACE_SECTIONS only", () => {
    const shell = fs.readFileSync(path.join(ROOT, "components/layout/WorkspaceShell.tsx"), "utf8");
    expect(shell).toMatch(/SURFACED_WORKSPACE_SECTIONS\.map/);
    // Make sure the unfiltered registry isn't iterated for nav rendering.
    expect(shell).not.toMatch(/(?<!SURFACED_)WORKSPACE_SECTIONS\.map\b/);
  });

  it("workspace home renders only surfaced section cards", () => {
    const home = fs.readFileSync(path.join(ROOT, "pages/workspace/WorkspaceHomePage.tsx"), "utf8");
    expect(home).toMatch(/SURFACED_WORKSPACE_SECTIONS/);
    expect(home).not.toMatch(/(?<!SURFACED_)WORKSPACE_SECTIONS\.filter/);
  });

  it("admin org-level quick actions surface canonical org destinations only", () => {
    const qa = fs.readFileSync(path.join(ROOT, "components/dashboard/QuickActionsGrid.tsx"), "utf8");
    // Org-level (no clientId) canonical set: workspaces, connectors, reports, docs.
    expect(qa).toMatch(/\/admin\/workspaces/);
    expect(qa).toMatch(/\/admin\/connectors/);
    expect(qa).toMatch(/\/admin\/reports/);
    expect(qa).toMatch(/\/admin\/docs/);
    // Client-scoped variant retains operational setup actions.
    expect(qa).toMatch(/\/admin\/campaigns\/new/);
    // Vendor-specific or compat targets must not surface as quick actions.
    expect(qa).not.toMatch(/\/admin\/five9\/campaign-builder/);
    expect(qa).not.toMatch(/href:\s*["'`]\/admin\/legal-connect["'`]/);
  });

  it("admin overview header uses canonical Organization Overview language", () => {
    const overview = fs.readFileSync(path.join(ROOT, "pages/admin/OverviewPage.tsx"), "utf8");
    expect(overview).toMatch(/Organization Overview/);
    expect(overview).not.toMatch(/Command Center/);
  });

  it("admin shell header uses canonical Docs and Assistant labels", () => {
    const shell = fs.readFileSync(path.join(ROOT, "components/layout/AdminShell.tsx"), "utf8");
    expect(shell).not.toMatch(/Five9 Docs/);
    expect(shell).not.toMatch(/AI Guide/);
    expect(shell).toMatch(/>Docs</);
    expect(shell).toMatch(/>Assistant</);
  });

  it("public marketing surfaces no longer advertise dropped vendor-feature tiles", () => {
    const files = [
      "components/marketing/MegaMenuHeader.tsx",
      "components/marketing/MegaFooter.tsx",
      "pages/LandingPage.tsx",
    ];
    const stalePhrases = [
      "Five9 SOAP integration",
      "Multi-domain Five9 management",
      "Multi-domain Five9",
      "Disposition email engine",
      "AI Call Flow builder",
      "Campaign blueprints",
    ];
    const hits: string[] = [];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const p of stalePhrases) {
        if (src.includes(p)) hits.push(`${rel}: "${p}"`);
      }
    }
    expect(hits, `Stale vendor-feature claims still on public surface:\n${hits.join("\n")}`).toEqual([]);
  });
});
