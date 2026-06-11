import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 1 Fabric59 reposition — locks the legacy-strip surface so future
 * cleanup passes can't accidentally re-mount a retired page or drop a
 * tombstone.
 *
 * Hardened invariants:
 *   1. Six retired source files stay deleted on disk.
 *   2. Their App.tsx imports stay absent.
 *   3. Their canonical replacement tombstones stay mounted.
 *   4. /superadmin/vault, /superadmin/vault/:id, /superadmin/exports are
 *      Navigate-only tombstones pointing at /superadmin/docs.
 *   5. /master/vault and /vault collapse onto /superadmin/docs.
 *   6. /analytics-legacy, /qa-legacy, /integrations-legacy mount the
 *      canonical WorkspaceResolveRedirect with the unauthenticated fallback
 *      to /app/workspaces.
 */
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

const RETIRED_FILES = [
  "src/pages/admin/ArchivedCampaignsPage.tsx",
  "src/pages/admin/CampaignBlueprintsPage.tsx",
  "src/pages/admin/CallFlowBuilderPage.tsx",
  "src/pages/superadmin/FeatureVaultPage.tsx",
  "src/pages/superadmin/FeatureVaultDetailPage.tsx",
  "src/pages/superadmin/SourceExportsPage.tsx",
];

describe("Phase 1 legacy tombstones · Fabric59 reposition", () => {
  const app = read("src/App.tsx");

  it("retired source files are gone from disk", () => {
    for (const rel of RETIRED_FILES) {
      let exists = true;
      try {
        readFileSync(resolve(process.cwd(), rel), "utf8");
      } catch {
        exists = false;
      }
      expect(exists, `${rel} must not exist`).toBe(false);
    }
  });

  it("App.tsx no longer imports any retired page module", () => {
    for (const sym of [
      "FeatureVaultPage",
      "FeatureVaultDetailPage",
      "SourceExportsPage",
      "ArchivedCampaignsPage",
      "CampaignBlueprintsPage",
      "CallFlowBuilderPage",
    ]) {
      expect(app, `${sym} must not be imported`).not.toMatch(new RegExp(`^import\\s+${sym}\\b`, "m"));
    }
  });

  it("superadmin vault routes tombstone to /superadmin/docs", () => {
    for (const path of ["vault", "vault/:id", "exports"]) {
      const re = new RegExp(
        `<Route\\s+path="${path.replace(/:/g, "\\:")}"\\s+element=\\{<Navigate\\s+to="/superadmin/docs"\\s+replace\\s*/>}`,
      );
      expect(app, `tombstone for ${path}`).toMatch(re);
    }
  });

  it("top-level vault aliases tombstone to /superadmin/docs", () => {
    expect(app).toMatch(
      /<Route\s+path="\/master\/vault"\s+element=\{<Navigate\s+to="\/superadmin\/docs"\s+replace\s*\/>}/,
    );
    expect(app).toMatch(
      /<Route\s+path="\/vault"\s+element=\{<Navigate\s+to="\/superadmin\/docs"\s+replace\s*\/>}/,
    );
  });

  it("workspace-scoped legacy tombstones are mounted", () => {
    expect(app).toMatch(
      /<Route\s+path="\/analytics-legacy"\s+element=\{<WorkspaceResolveRedirect\s+to="\/w\/:workspaceId\/analytics"\s*\/>}/,
    );
    expect(app).toMatch(
      /<Route\s+path="\/qa-legacy"\s+element=\{<WorkspaceResolveRedirect\s+to="\/w\/:workspaceId\/qa"\s*\/>}/,
    );
    expect(app).toMatch(
      /<Route\s+path="\/integrations-legacy"\s+element=\{<WorkspaceResolveRedirect\s+to="\/w\/:workspaceId\/integrations"\s*\/>}/,
    );
  });

  it("WorkspaceResolveRedirect ships an unauthenticated fallback to /app/workspaces", () => {
    expect(app).toMatch(/!authLoading\s*&&\s*!user/);
    expect(app).toMatch(/<Navigate\s+to="\/app\/workspaces"\s+replace\s*\/>/);
  });
});

describe("Phase 1 Pass-2B · canonical workspace nav lock", () => {
  it("legacy WORKSPACE_SECTIONS export no longer exists in navigation.ts", () => {
    const nav = read("src/config/navigation.ts");
    expect(nav).not.toMatch(/^\s*export\s+const\s+WORKSPACE_SECTIONS\b/m);
    expect(nav).not.toMatch(/^\s*export\s+type\s+WorkspaceNavItem\b/m);
  });

  it("canonical workspace nav is the single source", () => {
    const canon = read("src/config/canonicalNav.ts");
    expect(canon).toMatch(/export\s+const\s+WORKSPACE_NAV\b/);
    expect(canon).toMatch(/export\s+const\s+WORKSPACE_NAV_GROUPS\b/);
  });
});
