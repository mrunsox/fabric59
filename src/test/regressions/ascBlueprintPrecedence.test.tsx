import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1" },
    organization: { id: "org-1", integration_configs: {} },
  }),
}));
vi.mock("@/pages/workspace/WorkspaceCampaignNewPage", () => ({
  default: () => <div data-testid="manual-intake">manual</div>,
}));
vi.mock("@/pages/workspace/campaigns/asc/AscWizardPage", () => ({
  default: () => <div data-testid="asc-wizard-mounted">wizard</div>,
}));

import WorkspaceCampaignNewDecisionPage from "@/pages/workspace/campaigns/WorkspaceCampaignNewDecisionPage";

const FLAG_KEY = "fabric59.features.ascWizard.enabled";

function mount(initial: Parameters<typeof MemoryRouter>[0]["initialEntries"]) {
  return render(
    <MemoryRouter initialEntries={initial}>
      <Routes>
        <Route
          path="/w/:workspaceId/campaigns/new"
          element={<WorkspaceCampaignNewDecisionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AI blueprint precedence over ASC (Slice 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("router state with source=ai-blueprint → manual page, regardless of ASC flag (flag OFF)", () => {
    mount([
      {
        pathname: "/w/ws-1/campaigns/new",
        search: "?source=ai",
        state: { source: "ai-blueprint", prefill: { campaignName: "Acme" } },
      },
    ]);
    expect(screen.getByTestId("manual-intake")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-mounted")).not.toBeInTheDocument();
  });

  it("router state with source=ai-blueprint → manual page even when ASC flag is ON", () => {
    window.localStorage.setItem(FLAG_KEY, "1");
    mount([
      {
        pathname: "/w/ws-1/campaigns/new",
        search: "?source=ai",
        state: { source: "ai-blueprint", prefill: { campaignName: "Acme" } },
      },
    ]);
    expect(screen.getByTestId("manual-intake")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-mounted")).not.toBeInTheDocument();
  });

  it("?aiBlueprint=<id> query marker → manual page even when ASC flag is ON", () => {
    window.localStorage.setItem(FLAG_KEY, "1");
    mount(["/w/ws-1/campaigns/new?aiBlueprint=abc"]);
    expect(screen.getByTestId("manual-intake")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-mounted")).not.toBeInTheDocument();
  });

  it("no blueprint marker + ASC flag ON → assisted wizard", () => {
    window.localStorage.setItem(FLAG_KEY, "1");
    mount(["/w/ws-1/campaigns/new"]);
    expect(screen.getByTestId("asc-wizard-mounted")).toBeInTheDocument();
    expect(screen.queryByTestId("manual-intake")).not.toBeInTheDocument();
  });
});
