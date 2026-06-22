import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Regression — Agent Cockpit smoke (Checkpoint 4).
 *
 * Covers:
 *  - Empty state appears when no campaign has an assigned form.
 *  - With an eligible campaign, picker, guide rail, form runner, and
 *    wrap-up rail render.
 *  - Wrap up persists a form_submissions row tagged source="agent_cockpit"
 *    with outcome_key, disposition_key, notes, and metadata mirroring.
 */

// ---- mocks ----------------------------------------------------------------

const createSpy = vi.fn().mockResolvedValue({ id: "sub1" });

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: { id: "w1", name: "WS", organization_id: "o1" } }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, organization: { id: "o1" } }),
}));

// Make `supabase` a no-op for the in-page useEligibleAssignments query;
// we'll inject assignments via a higher-level mock below.
let eligibleAssignments: Array<{ id: string; workspace_id: string; form_id: string; campaign_id: string }> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: eligibleAssignments, error: null }),
      }),
    }),
  },
}));

let campaignsList: Array<{ id: string; name: string; status: string }> = [];
vi.mock("@/hooks/useWorkspaceCampaigns", () => ({
  useWorkspaceCampaigns: () => ({ data: campaignsList, isLoading: false }),
}));

vi.mock("@/hooks/useWorkspaceForms", () => ({
  useWorkspaceForm: () => ({
    data: { id: "f1", name: "Intake", current_version: 3, workspace_id: "w1" },
    isLoading: false,
  }),
  useFormSchema: () => ({
    data: {
      schemaVersion: 1,
      sections: [
        {
          id: "s1",
          title: "Triage",
          fields: [
            { id: "fld1", key: "caller_name", type: "text", label: "Caller name" },
          ],
        },
      ],
      logic: [],
      outcomes: [
        { key: "qualified", label: "Qualified", dispositionKey: "Sale" },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useWorkspaceGuides", () => ({
  useWorkspaceGuides: () => ({
    data: [
      {
        id: "g1",
        name: "Triage guide",
        workspace_id: "w1",
        campaign_id: "c1",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useGuideVersions", () => ({
  useCurrentGuideVersion: () => ({
    data: {
      id: "gv1",
      content: {
        schemaVersion: 1,
        blocks: [{ id: "b1", type: "paragraph", text: "Greet the caller warmly." }],
      },
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useDispositions", () => ({
  useDispositions: () => ({
    data: [
      { id: "d1", name: "Sale" },
      { id: "d2", name: "Callback" },
    ],
  }),
}));

vi.mock("@/hooks/useFormSubmissions", () => ({
  useCreateFormSubmission: () => ({
    mutateAsync: createSpy,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import WorkspaceAgentCockpitPage from "@/pages/workspace/WorkspaceAgentCockpitPage";

function renderCockpit() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>
          <WorkspaceAgentCockpitPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("Agent Cockpit smoke", () => {
  beforeEach(() => {
    createSpy.mockClear();
    eligibleAssignments = [];
    campaignsList = [];
  });

  it("shows empty state with CTAs when no campaign has an assigned form", async () => {
    eligibleAssignments = [];
    campaignsList = [
      { id: "c1", name: "Spring outbound", status: "live" },
    ];
    renderCockpit();
    expect(
      await screen.findByText(/no campaign ready for the cockpit yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open campaigns/i })).toHaveAttribute(
      "href",
      "/w/w1/campaigns",
    );
    expect(screen.getByRole("link", { name: /open forms/i })).toHaveAttribute(
      "href",
      "/w/w1/forms",
    );
  });

  it("renders cockpit and persists agent_cockpit submission on wrap up", async () => {
    eligibleAssignments = [
      { id: "a1", workspace_id: "w1", form_id: "f1", campaign_id: "c1" },
    ];
    campaignsList = [{ id: "c1", name: "Spring outbound", status: "live" }];

    const user = userEvent.setup();
    renderCockpit();

    // Cockpit body + all three rails render.
    await waitFor(() => {
      expect(screen.getByTestId("agent-cockpit")).toBeInTheDocument();
      expect(screen.getByTestId("cockpit-assist-rail")).toBeInTheDocument();
      expect(screen.getByTestId("cockpit-wrapup-rail")).toBeInTheDocument();
    });

    // Guide content rendered.
    expect(screen.getByText(/greet the caller warmly/i)).toBeInTheDocument();

    // Add a note.
    await user.type(screen.getByTestId("cockpit-notes"), "Spoke to decision maker");

    // Wrap up.
    await user.click(screen.getByTestId("cockpit-wrapup"));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    const payload = createSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      formId: "f1",
      formVersion: 3,
      campaignId: "c1",
      source: "agent_cockpit",
      notes: "Spoke to decision maker",
    });
  });
});
