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
  "shells/WorkspaceShell.tsx",
  "components/layout/SuperadminShell.tsx",
  "components/layout/SectionTabs.tsx",
  "components/marketing/MegaMenuHeader.tsx",
  "components/dashboard/QuickActionsGrid.tsx",
  "components/dashboard/ReadinessChecklist.tsx",
  "components/dashboard/SystemHealthStrip.tsx",
  "components/dashboard/AIGuidanceCard.tsx",
  "components/dashboard/WorkspaceSnapshotPanel.tsx",
  "components/dashboard/ConnectorsReportsPanel.tsx",
  // pages/workspace/WorkspaceHomePage.tsx — retired (KPI strip → WorkspaceContextBar).
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
  "/admin/campaigns/new",
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

  it("workspace shell secondary nav renders from canonical nav primitives", () => {
    const shell = fs.readFileSync(path.join(ROOT, "shells/WorkspaceShell.tsx"), "utf8");
    // Canonical primitives (post nav-convergence).
    expect(shell).toMatch(/WORKSPACE_NAV_GROUPS/);
    expect(shell).toMatch(/WORKSPACE_NAV_PINNED/);
    expect(shell).toMatch(/WORKSPACE_NAV_GROUPS\.map/);
    // Legacy primitive must not drive nav rendering anymore.
    expect(shell).not.toMatch(/WORKSPACE_SECTIONS\b/);
  });

  it.skip("workspace home renders only surfaced section cards (retired — see WorkspaceContextBar)", () => {
    // WorkspaceHomePage was retired; KPI counters now live in
    // src/components/workspace/WorkspaceContextBar.tsx rendered above every
    // /w/:id/* surface. Assertion preserved as a skip for history.
  });


  it("admin org-level quick actions surface canonical org destinations only", () => {
    const qa = fs.readFileSync(path.join(ROOT, "components/dashboard/QuickActionsGrid.tsx"), "utf8");
    // Org-level (no clientId) canonical set: workspaces, connectors, reports, docs.
    expect(qa).toMatch(/\/admin\/workspaces/);
    expect(qa).toMatch(/\/admin\/connectors/);
    expect(qa).toMatch(/\/admin\/reports/);
    expect(qa).toMatch(/\/admin\/docs/);
    // Client-scoped "Create campaign" must target the canonical workspace-scoped
    // intake (/w/:workspaceId/campaigns/new) — never the redirect-only
    // /admin/campaigns/new write surface.
    expect(qa).toMatch(/\/w\/\$\{workspaceId\}\/campaigns\/new/);
    expect(qa).not.toMatch(/["'`]\/admin\/campaigns\/new/);
    // Vendor-specific or compat targets must not surface as quick actions.
    expect(qa).not.toMatch(/\/admin\/five9\/campaign-builder/);
    expect(qa).not.toMatch(/href:\s*["'`]\/admin\/legal-connect["'`]/);
  });

  it("admin overview header uses canonical Organization Overview language", () => {
    const overview = fs.readFileSync(path.join(ROOT, "pages/admin/OverviewPage.tsx"), "utf8");
    expect(overview).toMatch(/Organization Overview/);
    expect(overview).not.toMatch(/Command Center/);
  });

  it("admin overview cockpit mounts the canonical workspace + connectors/reports panels", () => {
    const overview = fs.readFileSync(path.join(ROOT, "pages/admin/OverviewPage.tsx"), "utf8");
    expect(overview).toMatch(/<WorkspaceSnapshotPanel\b/);
    expect(overview).toMatch(/<ConnectorsReportsPanel\b/);
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

/**
 * Phase G — Canonical experience rebuild assertions.
 *
 * Locks in the rebuilt marketing surfaces, mega menu content model, hero
 * canonical copy, org-level admin quick-action set, and the strict no-status-
 * badge rule on marketing capability tiles.
 */
describe("Phase G · canonical experience rebuild", () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

  // ---- Mega menu content model ----------------------------------------------
  it("mega menu surfaces the 5 canonical operating motions", () => {
    const src = read("components/marketing/MegaMenuHeader.tsx");
    const motions = [
      "Inbound intake",
      "Outbound reactivation",
      "QA and review",
      "CRM sync and handoff",
      "Monitoring and readiness",
    ];
    for (const m of motions) {
      expect(src, `Mega menu missing canonical motion: ${m}`).toContain(m);
    }
    // All motions must anchor into the canonical /solutions sections.
    expect(src).toMatch(/href:\s*["'`]\/solutions#inbound-intake/);
    expect(src).toMatch(/href:\s*["'`]\/solutions#outbound-reactivation/);
    expect(src).toMatch(/href:\s*["'`]\/solutions#crm-sync-handoff/);
    expect(src).toMatch(/href:\s*["'`]\/solutions#monitoring-readiness/);
  });

  it("mega menu surfaces the 4 canonical personas", () => {
    const src = read("components/marketing/MegaMenuHeader.tsx");
    for (const p of ["Ops leader", "Supervisor", "Implementation / admin", "Intake / service ops owner"]) {
      expect(src, `Mega menu missing canonical persona: ${p}`).toContain(p);
    }
  });

  it("mega menu primary nav exposes the canonical marketing surfaces", () => {
    const src = read("components/marketing/MegaMenuHeader.tsx");
    // Direct primary links (no duplicates of mega-menu triggers).
    for (const route of ["/integrations", "/pricing", "/customers"]) {
      const re = new RegExp(`to:\\s*["'\`]${route}["'\`]`);
      expect(src.match(re), `Missing primary nav link: ${route}`).toBeTruthy();
    }
    // /solutions and /personas are surfaced as mega-menu triggers + section anchors,
    // and must not appear duplicated as direct primary links.
    expect(src).not.toMatch(/to:\s*["'`]\/solutions["'`]/);
    expect(src).not.toMatch(/to:\s*["'`]\/personas["'`]/);
  });

  it("mega menu surfaces no client-facing Resources/sales-only panel", () => {
    const src = read("components/marketing/MegaMenuHeader.tsx");
    // Lead-magnet routes are footer/in-page CTAs only — not header-surfaced.
    expect(src).not.toMatch(/\/contact\?topic=pilot-guide/);
    expect(src).not.toMatch(/\/contact\?topic=intake-playbook/);
    expect(src).not.toMatch(/\/contact\?topic=five9-crm-blueprint/);
    expect(src).not.toMatch(/\/contact\?topic=docs/);
    // No "Resources" trigger label remains in the header source.
    expect(src).not.toMatch(/>\s*Resources\s*</);
    // Self-serve downloads never appear in the header.
    expect(src).not.toMatch(/href:\s*["'`][^"'`]*\.(pdf|zip|docx)["'`]/i);
    expect(src).not.toMatch(/href:\s*["'`]\/demo["'`]/);
  });

  // ---- Hero / canonical landing copy ----------------------------------------
  it("landing hero uses the canonical operational-intelligence headline", () => {
    const src = read("pages/LandingPage.tsx");
    expect(src).toMatch(/Operational intelligence/);
    expect(src).toMatch(/Five9 contact centers/);
    expect(src).toMatch(/Multi-tenant\s+·\s+Five9-native/);
    // Primary hero CTA goes to /contact (concierge), never /signup or /demo.
    expect(src).toMatch(/to:\s*["'`]\/contact(\?[^"'`]*)?["'`]/);
    expect(src).not.toMatch(/to:\s*["'`]\/demo["'`]/);
  });

  // ---- Quick actions canonical set -----------------------------------------
  it("org-level quick actions are exactly the 4 canonical entries", () => {
    const src = read("components/dashboard/QuickActionsGrid.tsx");
    for (const t of ["View workspaces", "Open connectors", "View reports", "Open docs"]) {
      expect(src, `Org quick action missing: ${t}`).toContain(t);
    }
    for (const stale of [
      "Open Five9",
      "Open Legal Connect",
      "Open Scripter",
      "Open ScriptFlow",
      "Open Tree Editor",
      "Open Call Flow",
      "Open Campaign Builder",
    ]) {
      expect(src, `Stale quick action surfaced: ${stale}`).not.toContain(stale);
    }
  });

  it("client-scoped quick actions retain canonical setup CTAs", () => {
    const src = read("components/dashboard/QuickActionsGrid.tsx");
    expect(src).toMatch(/Create campaign/);
    expect(src).toMatch(/Connect provider/);
    expect(src).toMatch(/Run readiness test/);
    expect(src).toMatch(/\/admin\/clients\/\$\{clientId\}\/legal-connect/);
    // Create campaign goes to canonical workspace intake, never the redirect.
    expect(src).toMatch(/\/w\/\$\{workspaceId\}\/campaigns\/new/);
    expect(src).not.toMatch(/["'`]\/admin\/campaigns\/new/);
  });

  // ---- No status / readiness badges on marketing capability tiles -----------
  it("CapabilityCard primitive exposes no status/readiness badge surface", () => {
    const src = read("components/marketing/CapabilityCard.tsx");
    expect(src).not.toMatch(/\b(status|badge|readiness|lifecycle)\??\s*:/i);
    for (const word of ["Coming Soon", "Partial", "Beta"]) {
      const re = new RegExp(`["'>\\s]${word}["'<\\s]`);
      expect(src, `CapabilityCard must not render status word: ${word}`).not.toMatch(re);
    }
  });

  it("rebuilt marketing pages render no status/readiness badges on capability tiles", () => {
    const pages = [
      "pages/marketing/SolutionsPage.tsx",
      "pages/marketing/PersonasPage.tsx",
      "pages/marketing/IntegrationsIndexPage.tsx",
      "pages/marketing/PricingPage.tsx",
      "pages/marketing/CustomersPage.tsx",
    ];
    for (const rel of pages) {
      const src = read(rel);
      expect(src, `${rel} must not render <StatusBadge />`).not.toMatch(/<StatusBadge\b/);
      expect(src, `${rel} must not pass status/badge prop to a card`).not.toMatch(
        /<CapabilityCard\b[^>]*\b(status|badge|readiness)=/,
      );
    }
  });

  it("integrations index removes the 'Stub' provider tile and any status pills", () => {
    const src = read("pages/marketing/IntegrationsIndexPage.tsx");
    expect(src, "Stub CRM tile must be gone").not.toMatch(/title:\s*["'`]Stub/);
    expect(src).not.toMatch(/>\s*Coming Soon\s*</);
  });
});

/**
 * Phase H — Premium marketing + auth + onboarding rebuild assertions.
 *
 * Locks in the shared shells (AuthShell, OnboardingShell), tightened footer,
 * and the rule that onboarding lands users in /app/workspaces/:id/home.
 */
describe("Phase H · premium marketing + auth + onboarding rebuild", () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

  it("shared AuthShell primitive exists with grounded product-truth panel", () => {
    const src = read("components/auth/AuthShell.tsx");
    expect(src).toMatch(/Operational intelligence/);
    expect(src).toMatch(/Five9 contact centers/);
    // Must not fabricate vanity proof.
    expect(src).not.toMatch(/SOC\s*2/);
    expect(src).not.toMatch(/\b\d+,?\d*\+\s*(users|customers|teams)\b/i);
  });

  it("login, signup, forgot, reset, and accept-invite all use AuthShell", () => {
    const pages = [
      "pages/auth/LoginPage.tsx",
      "pages/auth/SignupPage.tsx",
      "pages/auth/ForgotPasswordPage.tsx",
      "pages/auth/ResetPasswordPage.tsx",
      "pages/auth/AcceptInvitePage.tsx",
    ];
    for (const rel of pages) {
      const src = read(rel);
      expect(src, `${rel} must import AuthShell`).toMatch(/from\s+["']@\/components\/auth\/AuthShell["']/);
      expect(src, `${rel} must render <AuthShell`).toMatch(/<AuthShell\b/);
    }
  });

  it("shared OnboardingShell primitive exists with concierge framing", () => {
    const src = read("components/onboarding/OnboardingShell.tsx");
    expect(src).toMatch(/Concierge setup/);
    expect(src).toMatch(/activeKey/);
  });

  it("onboarding and workspace bootstrap both use OnboardingShell", () => {
    for (const rel of [
      "pages/onboarding/OnboardingPage.tsx",
      "pages/onboarding/WorkspaceBootstrapPage.tsx",
    ]) {
      const src = read(rel);
      expect(src, `${rel} must use OnboardingShell`).toMatch(/<OnboardingShell\b/);
    }
  });

  it("onboarding final handoff lands in /app/workspaces/:id/home, not /admin", () => {
    const src = read("pages/onboarding/OnboardingPage.tsx");
    expect(src).toMatch(/\/app\/workspaces\/\$\{[^}]+\}\/home/);
    // Must not redirect first-run users straight into /admin.
    expect(src).not.toMatch(/navigate\(\s*["'`]\/admin["'`]/);
  });

  it("MegaFooter no longer surfaces fabricated AES / RLS marketing capsules", () => {
    const src = read("components/marketing/MegaFooter.tsx");
    expect(src).not.toMatch(/AES-256/);
    expect(src).not.toMatch(/Security posture/);
    // Trust narrative still reachable.
    expect(src).toMatch(/\/trust/);
  });

  it("MegaFooter resource links route only to /contact?topic= (no self-serve downloads)", () => {
    const src = read("components/marketing/MegaFooter.tsx");
    expect(src).not.toMatch(/href:\s*["'`][^"'`]*\.(pdf|zip|docx)["'`]/i);
    expect(src).toMatch(/\/contact\?topic=pilot-guide/);
  });
});

/**
 * AI blueprint → canonical workspace intake handoff.
 *
 * Locks in that AIBlueprintBuilder navigates the prefill into the
 * workspace-scoped intake (/w/:workspaceId/campaigns/new) and never sends
 * users (or their state.prefill) through the redirect-only
 * /admin/campaigns/new route, where <Navigate> would silently drop the state.
 */
describe("AI blueprint → workspace intake handoff", () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(ROOT, rel), "utf8");

  it("AIBlueprintBuilder no longer navigates to /admin/campaigns/new", () => {
    const src = read("components/campaigns/AIBlueprintBuilder.tsx");
    expect(src).not.toMatch(/navigate\(\s*["'`]\/admin\/campaigns\/new/);
  });

  it("AIBlueprintBuilder navigates into the canonical workspace intake with prefill state", () => {
    const src = read("components/campaigns/AIBlueprintBuilder.tsx");
    // Workspace-scoped target with a workspaceId interpolation.
    expect(src).toMatch(/navigate\(\s*`\/w\/\$\{[^}]+\}\/campaigns\/new/);
    // Resolution uses the shared active-workspace hook.
    expect(src).toMatch(/useActiveWorkspaceId/);
    // Prefill is carried via router state.
    expect(src).toMatch(/state:\s*\{[^}]*prefill:\s*campaignData/);
    // Source tag identifies the AI handoff to the receiving page.
    expect(src).toMatch(/source:\s*["'`]ai-blueprint["'`]/);
  });

  it("WorkspaceCampaignNewPage reads the AI prefill from router state", () => {
    const src = read("pages/workspace/WorkspaceCampaignNewPage.tsx");
    expect(src).toMatch(/useLocation/);
    expect(src).toMatch(/state\.source\s*===\s*["'`]ai-blueprint["'`]/);
    // Renders a banner so the user sees the form is AI-seeded.
    expect(src).toMatch(/data-testid="ai-prefill-banner"/);
    // Still mounts the canonical CampaignIntakePage which already reads
    // location.state.prefill — guard the import so we don't accidentally
    // detach the receiving form.
    expect(src).toMatch(/CampaignIntakePage/);
  });

  it("CampaignIntakePage still seeds its form from location.state.prefill", () => {
    const src = read("pages/admin/CampaignIntakePage.tsx");
    expect(src).toMatch(/location\.state[^;]*prefill/);
  });
});

