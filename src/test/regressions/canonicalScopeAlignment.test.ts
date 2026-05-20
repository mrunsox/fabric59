import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WORKSPACE_NAV,
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_PINNED,
  WORKSPACE_NAV_DEMOTED,
} from "@/config/canonicalNav";

/**
 * Canonical scope alignment — Phase B.
 *
 * Locks in the workspace-shell route matrix so refactors can't silently
 * drop a canonical surface. We assert against the raw App.tsx source
 * (string match) rather than booting the router so this test is fast and
 * independent of provider plumbing.
 */

const APP_TSX = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

const REQUIRED_ROUTES = [
  "home",
  "campaigns",
  "guides",
  "forms",
  "templates",
  "clients",
  "dispositions",
  "notifications",
  "knowledge",
  "assistant",
  "qa",
  "analytics",
  "integrations",
  "settings",
  "agent",
];

describe("canonical scope — workspace route matrix", () => {
  for (const path of REQUIRED_ROUTES) {
    it(`mounts /w/:workspaceId/${path}`, () => {
      const re = new RegExp(`<Route\\s+path=["']${path}["']`);
      expect(APP_TSX, `App.tsx must mount route "${path}"`).toMatch(re);
    });
  }

  it("keeps demoted Runs / Agents / Supervisor routes mounted (deep-link safe)", () => {
    expect(APP_TSX).toMatch(/<Route\s+path=["']runs["']/);
    expect(APP_TSX).toMatch(/<Route\s+path=["']agents["']/);
    expect(APP_TSX).toMatch(/<Route\s+path=["']supervisor["']/);
  });
});

describe("canonical nav config", () => {
  it("WORKSPACE_NAV exposes a flat union including demoted items", () => {
    const keys = WORKSPACE_NAV.map((n) => n.key);
    for (const k of [
      "home", "campaigns", "guides", "forms", "templates", "clients",
      "dispositions", "notifications", "knowledge", "assistant",
      "qa", "analytics", "integrations", "settings",
      "runs", "agents", "supervisor", "agent",
    ]) {
      expect(keys, `WORKSPACE_NAV missing "${k}"`).toContain(k);
    }
  });

  it("renders Build / Operate / Insight groups in order", () => {
    expect(WORKSPACE_NAV_GROUPS.map((g) => g.label)).toEqual([
      "Build",
      "Operate",
      "Insight",
    ]);
  });

  it("Settings is pinned at the bottom", () => {
    expect(WORKSPACE_NAV_PINNED.map((n) => n.key)).toEqual(["settings"]);
  });

  it("demotes Runs / Agents / Supervisor (Agent cockpit is promoted in Operate)", () => {
    const demotedKeys = WORKSPACE_NAV_DEMOTED.map((n) => n.key);
    expect(demotedKeys).toEqual(
      expect.arrayContaining(["runs", "agents", "supervisor"]),
    );
    expect(demotedKeys).not.toContain("agent");
  });

  it("no demoted item leaks into the visible groups; Agent cockpit lives in Operate", () => {
    const visible = WORKSPACE_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    for (const k of ["runs", "agents", "supervisor"]) {
      expect(visible, `"${k}" must not appear in the primary sidebar`).not.toContain(k);
    }
    const operate = WORKSPACE_NAV_GROUPS.find((g) => g.label === "Operate");
    expect(operate?.items.map((i) => i.key)).toContain("agent");
  });
});

/**
 * Phase D — legacy de-surface, redirect, and deletion locks.
 *
 * Each redirected legacy path must keep a Navigate/WorkspaceResolveRedirect
 * mount in App.tsx so external bookmarks and command-palette deep links
 * never 404. Each deleted page file must stay deleted.
 */

const REDIRECTS: Array<{ from: string; toContains: string }> = [
  { from: "ani-blocklist", toContains: "/admin/settings" },
  { from: "callback-queue", toContains: "/admin/settings" },
  { from: "abandon-rate", toContains: "/admin/settings" },
  { from: "qr-routing", toContains: "/admin/settings" },
  { from: "automations", toContains: "/w/:workspaceId/notifications" },
  { from: "data-plane", toContains: "/superadmin" },
  { from: "identity", toContains: "/superadmin" },
  { from: "utilities", toContains: "/superadmin" },
  { from: "five9", toContains: "/admin/connectors/five9" },
  { from: "clients/:clientId/five9-overlay", toContains: "/admin/campaigns" },
];

describe("canonical scope — Phase D legacy redirects", () => {
  for (const { from, toContains } of REDIRECTS) {
    it(`/admin/${from} silent-redirects to ${toContains}`, () => {
      const re = new RegExp(
        `<Route\\s+path=["']${from.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["'][^>]*element=\\{<(Navigate|WorkspaceResolveRedirect)\\s+to=["']${toContains.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["']`,
      );
      expect(APP_TSX, `Missing redirect for /admin/${from}`).toMatch(re);
    });
  }

  it("/superadmin/call-flow silent-redirects to /admin/connectors", () => {
    expect(APP_TSX).toMatch(
      /<Route\s+path=["']call-flow["']\s+element=\{<Navigate\s+to=["']\/admin\/connectors["']/,
    );
  });
});

describe("canonical scope — Phase D deletions", () => {
  const DELETED = [
    "src/pages/admin/ANIBlockListPage.tsx",
    "src/pages/admin/AbandonRatePage.tsx",
    "src/pages/admin/CallbackQueuePage.tsx",
    "src/pages/admin/QrRoutingPage.tsx",
    "src/pages/admin/CampaignOverlayPage.tsx",
    "src/pages/admin/CampaignOverlayListPage.tsx",
  ];
  for (const rel of DELETED) {
    it(`${rel} stays deleted`, () => {
      const abs = resolve(__dirname, "../../../", rel);
      let exists = true;
      try {
        readFileSync(abs);
      } catch {
        exists = false;
      }
      expect(exists, `${rel} must remain deleted`).toBe(false);
    });
  }
});
