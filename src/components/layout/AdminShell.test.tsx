import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

// --- Mocks ---
const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/config/navigation", () => ({
  GLOBAL_SECTIONS: [],
  findActiveSection: () => undefined,
}));

vi.mock("@/components/layout/SectionTabs", () => ({ SectionTabs: () => null }));
vi.mock("@/components/docs/Five9DocsPanel", () => ({ Five9DocsPanel: () => null }));
vi.mock("@/components/assistant/GuidancePanel", () => ({ GuidancePanel: () => null }));
vi.mock("@/components/assistant/AssistantButton", () => ({ AssistantButton: () => null }));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/layout/ScrollToTopButton", () => ({ ScrollToTopButton: () => null }));
vi.mock("@/components/ui/health-indicator", () => ({ HealthIndicator: () => null }));
vi.mock("@/components/brand/Fabric59Icon", () => ({ Fabric59Icon: () => null }));

import { AdminShell } from "./AdminShell";

const baseAuth = {
  organization: { id: "o1", name: "Acme" },
  organizations: [{ id: "o1", name: "Acme" }],
  switchOrganization: vi.fn(),
  signOut: vi.fn(),
  user: { email: "u@test.com" },
  hasPermission: () => true,
  isMasterAdmin: true,
};

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <TooltipProvider>
        <AdminShell />
      </TooltipProvider>
    </MemoryRouter>
  );
}

describe("AdminShell — Platform Admin switcher", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthMock.mockReset();
  });

  it("renders Platform Admin link for master_admin in collapsed rail (icon + tooltip label)", () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isMasterAdmin: true });
    localStorage.setItem("fabric59:nav:expanded", "0");
    renderShell();

    const link = screen.getByLabelText("Platform Admin");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/superadmin");
  });

  it("renders Platform Admin link with visible label for master_admin in expanded rail", () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isMasterAdmin: true });
    localStorage.setItem("fabric59:nav:expanded", "1");
    renderShell();

    const link = screen.getByLabelText("Platform Admin");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/superadmin");
    // Visible text label appears only in expanded mode
    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
  });

  it("does NOT render Platform Admin link for non-master_admin users", () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isMasterAdmin: false });
    renderShell();

    expect(screen.queryByLabelText("Platform Admin")).not.toBeInTheDocument();
  });
});
