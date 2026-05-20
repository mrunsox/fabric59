import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Regression — Form detail renders a recent submissions table (Checkpoint 4).
 */

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: { id: "w1", name: "WS", organization_id: "o1" } }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, organization: { id: "o1" } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/hooks/useWorkspaceForms", () => ({
  useWorkspaceForm: () => ({
    data: {
      id: "f1",
      name: "Intake form",
      description: null,
      status: "draft",
      current_version: 1,
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
  }),
  useFormSchema: () => ({
    data: { schemaVersion: 1, sections: [], logic: [], outcomes: [] },
  }),
}));

vi.mock("@/hooks/useWorkspaceCampaigns", () => ({
  useWorkspaceCampaigns: () => ({
    data: [{ id: "c1", name: "Spring outbound", status: "live" }],
  }),
}));

vi.mock("@/hooks/useFormCampaignAssignments", () => ({
  useFormCampaignAssignments: () => ({
    data: [],
    attachCampaign: vi.fn(),
    detachCampaign: vi.fn(),
    isMutating: false,
  }),
}));

vi.mock("@/hooks/useFormSubmissions", () => ({
  useFormSubmissions: () => ({
    data: [
      {
        id: "sub1",
        workspace_id: "w1",
        form_id: "f1",
        form_version: 1,
        campaign_id: "c1",
        source: "agent_cockpit",
        payload: {},
        mapped: {},
        submitted_by: "u1",
        submitted_at: new Date().toISOString(),
        outcome_key: "qualified",
        disposition_key: "Sale",
        notes: "ok",
        metadata: {},
      },
    ],
    isLoading: false,
  }),
}));

import WorkspaceFormDetailPage from "@/pages/workspace/WorkspaceFormDetailPage";

describe("WorkspaceFormDetailPage — recent submissions", () => {
  it("renders the recent submissions panel with the agent_cockpit row", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemoryRouter initialEntries={["/w/w1/forms/f1"]}>
            <Routes>
              <Route path="/w/:workspaceId/forms/:formId" element={<WorkspaceFormDetailPage />} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-submissions-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("submission-row-sub1")).toBeInTheDocument();
    expect(screen.getByText("agent_cockpit")).toBeInTheDocument();
    expect(screen.getByText("qualified")).toBeInTheDocument();
    expect(screen.getByText("Sale")).toBeInTheDocument();
  });
});
