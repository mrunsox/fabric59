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

  it("demotes Runs / Agents / Supervisor / Agent cockpit", () => {
    const demotedKeys = WORKSPACE_NAV_DEMOTED.map((n) => n.key);
    expect(demotedKeys).toEqual(
      expect.arrayContaining(["runs", "agents", "supervisor", "agent"]),
    );
  });

  it("no demoted item leaks into the visible groups", () => {
    const visible = WORKSPACE_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    for (const k of ["runs", "agents", "supervisor", "agent"]) {
      expect(visible, `"${k}" must not appear in the primary sidebar`).not.toContain(k);
    }
  });
});
