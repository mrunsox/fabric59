import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceCampaignNewPage from "@/pages/workspace/WorkspaceCampaignNewPage";

/**
 * AI blueprint → workspace intake handoff (runtime).
 *
 * Locks in that router state (`{ prefill, source: "ai-blueprint" }`) survives
 * the navigation into /w/:workspaceId/campaigns/new and that the workspace
 * surface renders its AI-seeded banner instead of the default info banner.
 *
 * We mock CampaignIntakePage to a marker — exercising the full intake form
 * pulls in supabase/auth/query providers that are out of scope for this
 * regression. The receiving page's own state-handling is what we want to
 * guard here.
 */
vi.mock("@/pages/admin/CampaignIntakePage", () => ({
  default: () => <div data-testid="campaign-intake">intake</div>,
}));
vi.mock("@/hooks/useWorkspaceSetupReadiness", () => ({
  useWorkspaceSetupReadiness: () => ({
    steps: [],
    completed: 0,
    total: 0,
    isReady: true,
    nextStep: null,
    isLoading: false,
  }),
}));

describe("WorkspaceCampaignNewPage · AI prefill handoff", () => {
  function renderAt(state: unknown) {
    return render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/w/ws-1/campaigns/new", search: "?source=ai", state },
        ]}
      >
        <Routes>
          <Route
            path="/w/:workspaceId/campaigns/new"
            element={<WorkspaceCampaignNewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("renders the AI banner when navigated with prefill state from AIBlueprintBuilder", () => {
    renderAt({
      source: "ai-blueprint",
      prefill: { campaignName: "Demo intake", clientName: "Acme" },
    });
    expect(screen.getByTestId("ai-prefill-banner")).toBeInTheDocument();
    expect(screen.getByTestId("campaign-intake")).toBeInTheDocument();
  });

  it("falls back to the default info banner for non-AI navigations", () => {
    renderAt(undefined);
    expect(screen.queryByTestId("ai-prefill-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("campaign-intake")).toBeInTheDocument();
  });
});
