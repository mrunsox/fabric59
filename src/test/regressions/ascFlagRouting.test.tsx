import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1" },
    organization: { id: "org-1", integration_configs: {} },
  }),
}));
vi.mock("@/pages/admin/CampaignIntakePage", () => ({
  default: () => <div data-testid="campaign-intake-manual">manual</div>,
}));
vi.mock("@/pages/workspace/campaigns/asc/AscWizardPage", () => ({
  default: () => <div data-testid="asc-wizard-mounted">wizard</div>,
}));

import WorkspaceCampaignNewDecisionPage from "@/pages/workspace/campaigns/WorkspaceCampaignNewDecisionPage";

const STORAGE_KEY = "fabric59.features.ascWizard.enabled";

describe("ASC flag routing (Slice 1)", () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  });

  function renderDecision(initial = "/w/ws-1/campaigns/new") {
    return render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/w/:workspaceId/campaigns/new"
            element={<WorkspaceCampaignNewDecisionPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("flag OFF: renders manual intake in place at /campaigns/new (no redirect, no chooser)", () => {
    renderDecision();
    expect(screen.getByTestId("campaign-intake-manual")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-mounted")).not.toBeInTheDocument();
  });

  it("flag ON: mounts the ASC wizard host at /campaigns/new", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    renderDecision();
    expect(screen.getByTestId("asc-wizard-mounted")).toBeInTheDocument();
    expect(
      screen.queryByTestId("campaign-intake-manual"),
    ).not.toBeInTheDocument();
  });
});
