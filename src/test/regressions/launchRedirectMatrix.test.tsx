import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LaunchRedirectPage from "@/pages/auth/LaunchRedirectPage";

/**
 * /launch redirect matrix — locks in the master-admin-aware routing so a
 * fresh master admin lands in /onboarding rather than getting trapped at
 * /superadmin, while preserving /superadmin as the operator fallback when
 * the system already has data to operate on.
 *
 * Acceptance paths (mirrors the /outline spec):
 *   1. master admin + zero orgs + zero workspaces       → /onboarding
 *   2. master admin + org + zero workspaces             → /onboarding
 *   3. master admin + org + ≥1 workspace                → /w/:default/home
 *   4. master admin + zero orgs + system workspaces     → /superadmin
 */

type AuthMock = {
  isAuthenticated: boolean;
  isLoading: boolean;
  organization: { id: string } | null;
  organizations: Array<{ id: string }>;
  isMasterAdmin: boolean;
};

type WsMock = {
  workspaces: Array<{ id: string; organization_id: string; is_default: boolean }>;
  isLoading: boolean;
};

const authState: AuthMock = {
  isAuthenticated: true,
  isLoading: false,
  organization: null,
  organizations: [],
  isMasterAdmin: true,
};
const wsState: WsMock = { workspaces: [], isLoading: false };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => wsState,
}));

function renderLaunch() {
  let landed = "";
  const Probe = ({ where }: { where: string }) => {
    landed = where;
    return <div data-testid={`landed-${where.replace(/[/:]/g, "_")}`}>{where}</div>;
  };
  const view = render(
    <MemoryRouter initialEntries={["/launch"]}>
      <Routes>
        <Route path="/launch" element={<LaunchRedirectPage />} />
        <Route path="/onboarding" element={<Probe where="/onboarding" />} />
        <Route path="/superadmin" element={<Probe where="/superadmin" />} />
        <Route path="/login" element={<Probe where="/login" />} />
        <Route path="/w/:workspaceId/home" element={<Probe where="/w/:id/home" />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...view, getLanded: () => landed };
}

describe("/launch · master-admin redirect matrix", () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    authState.organization = null;
    authState.organizations = [];
    authState.isMasterAdmin = true;
    wsState.workspaces = [];
    wsState.isLoading = false;
  });

  it("master admin + zero orgs + zero workspaces → /onboarding", async () => {
    const { getLanded } = renderLaunch();
    await waitFor(() => expect(getLanded()).toBe("/onboarding"));
  });

  it("master admin + org + zero workspaces → /onboarding", async () => {
    authState.organizations = [{ id: "org-1" }];
    authState.organization = { id: "org-1" };
    wsState.workspaces = [];
    const { getLanded } = renderLaunch();
    await waitFor(() => expect(getLanded()).toBe("/onboarding"));
  });

  it("master admin + org + ≥1 workspace → /w/:default/home", async () => {
    authState.organizations = [{ id: "org-1" }];
    authState.organization = { id: "org-1" };
    wsState.workspaces = [
      { id: "ws-A", organization_id: "org-1", is_default: false },
      { id: "ws-B", organization_id: "org-1", is_default: true },
    ];
    const { getLanded } = renderLaunch();
    await waitFor(() => expect(getLanded()).toBe("/w/:id/home"));
  });

  it("master admin + zero orgs + system workspaces exist → /superadmin", async () => {
    authState.organizations = [];
    authState.organization = null;
    wsState.workspaces = [
      { id: "ws-X", organization_id: "org-other", is_default: true },
    ];
    const { getLanded } = renderLaunch();
    await waitFor(() => expect(getLanded()).toBe("/superadmin"));
  });

  it("unauthenticated → /login", async () => {
    authState.isAuthenticated = false;
    const { getLanded } = renderLaunch();
    await waitFor(() => expect(getLanded()).toBe("/login"));
  });
});

/**
 * Static guard — OnboardingPage must never unconditionally bounce master
 * admins out of the founding bootstrap. This regression cost a real master
 * admin the ability to seed their own org + workspace.
 */
describe("OnboardingPage · master-admin bootstrap guard", () => {
  it("does not unconditionally navigate isMasterAdmin to /superadmin", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/onboarding/OnboardingPage.tsx"),
      "utf8",
    );
    // The old footgun: `if (isMasterAdmin && !organization) navigate("/superadmin"`
    // Any future change that re-introduces an unconditional master-admin
    // bounce out of /onboarding should fail here.
    const offending = /if\s*\(\s*isMasterAdmin[^)]*\)\s*navigate\(\s*["'`]\/superadmin/;
    expect(
      offending.test(src),
      "OnboardingPage must not auto-bounce master admins to /superadmin",
    ).toBe(false);
  });

  it("renders a quiet 'Open Superadmin' affordance for master admins", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/onboarding/OnboardingPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/data-testid="onboarding-superadmin-link"/);
    expect(src).toMatch(/to="\/superadmin"/);
  });
});
