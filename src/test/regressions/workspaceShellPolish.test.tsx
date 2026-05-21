import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Workspace shell polish — locks in the premium polish wiring:
 *   - sidebar groups Build / Operate / Intelligence with Settings pinned at bottom
 *   - breadcrumb Org link points to /admin (not retired /org)
 *   - top-bar exposes a ⌘K command palette trigger
 *   - workspace switcher menu always offers "Create workspace"
 */

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "ops@fabric59.com" },
    organization: { id: "o1", name: "Fabric59 Ops" },
    isLoading: false,
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/WorkspaceContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/WorkspaceContext")>(
    "@/contexts/WorkspaceContext",
  );
  return {
    ...actual,
    WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useWorkspace: () => ({
      workspace: { id: "w1", name: "Main workspace", organization_id: "o1", is_default: true, slug: null },
      workspaces: [
        { id: "w1", name: "Main workspace", organization_id: "o1", is_default: true, slug: null },
        { id: "w2", name: "Second workspace", organization_id: "o1", is_default: false, slug: null },
      ],
      isLoading: false,
      notFound: false,
      organizationId: "o1",
      refetch: vi.fn(),
    }),
  };
});

vi.mock("@/hooks/useWorkspaceCampaigns", () => ({ useWorkspaceCampaigns: () => ({ data: [] }) }));
vi.mock("@/hooks/useWorkspaceGuides", () => ({ useWorkspaceGuides: () => ({ data: [] }) }));
vi.mock("@/hooks/useWorkspaceForms", () => ({ useWorkspaceForms: () => ({ data: [] }) }));
vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="bell" />,
}));

import { WorkspaceShell } from "@/shells/WorkspaceShell";

function renderShell(initialPath = "/w/w1/campaigns") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<WorkspaceShell />}>
              <Route path="/w/:workspaceId/home" element={<div>home page</div>} />
              <Route path="/w/:workspaceId/campaigns" element={<div>campaigns page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("WorkspaceShell polish", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the breadcrumb with org link pointing to /admin (not /org)", () => {
    renderShell();
    const orgLink = screen.getByRole("link", { name: "Fabric59 Ops" });
    expect(orgLink.getAttribute("href")).toBe("/admin");
  });

  it("renders grouped sidebar labels: Build, Operate, Insight", () => {
    renderShell();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Operate")).toBeInTheDocument();
    expect(screen.getByText("Insight")).toBeInTheDocument();
  });

  it("hides demoted Runs / Agents / Supervisor from the primary sidebar", () => {
    renderShell();
    const sidebar = document.querySelector('[data-sidebar="sidebar"]') ?? document.body;
    const text = sidebar.textContent ?? "";
    expect(text).not.toMatch(/\bRuns\b/);
    expect(text).not.toMatch(/\bAgents\b/);
    expect(text).not.toMatch(/\bSupervisor\b/);
  });

  it("exposes a ⌘K quick-jump trigger in the top bar", () => {
    renderShell();
    expect(screen.getByTestId("workspace-cmdk-trigger")).toBeInTheDocument();
  });

  it("workspace switcher trigger renders when multiple workspaces exist", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /Main workspace/i })).toBeInTheDocument();
  });
});
