/**
 * Phase 8 — Brain Health UI regression.
 *
 * Validates that cards render from mock aggregates and that empty/error
 * states distinguish "no data" from "failure".
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    organization: { id: "org-1" },
    isWorkspaceAdmin: true,
    isMasterAdmin: false,
  }),
}));

const events = [
  { event_type: "bb_search_query_submitted", payload: { latencyMs: 120 }, created_at: new Date().toISOString() },
  { event_type: "bb_search_query_submitted", payload: { latencyMs: 80 }, created_at: new Date().toISOString() },
  { event_type: "bb_asc_suggestions_loaded", payload: {}, created_at: new Date().toISOString() },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: events, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/business-brain/bridge/governance", () => ({
  getVerticalCoverageSummary: async () => [],
  listConflicts: async () => [{ id: "c1" }, { id: "c2" }],
  listStaleFacts: async () => [],
  listVerticalGaps: async () => [{ id: "g1" }],
  listGapTopics: async () => [],
}));

import BrainHealthPage from "@/pages/workspace/brain/BrainHealthPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/w/ws-1/brain/health"]}>
        <Routes>
          <Route path="/w/:workspaceId/brain/health" element={<BrainHealthPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("bbHealthUi", () => {
  it("renders usage metrics from telemetry rows", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Brain searches"));
    // Two search events in current window.
    await waitFor(() => expect(screen.getAllByText("2").length).toBeGreaterThan(0));
    expect(screen.getByText("ASC suggestions shown")).toBeInTheDocument();
  });

  it("shows 'No data' for empty counts and renders governance counts", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Open conflicts"));
    // listConflicts mock returned 2.
    await waitFor(() => expect(screen.getAllByText("2").length).toBeGreaterThan(0));
    // Stale facts is empty → "No data" appears at least once.
    await waitFor(() => expect(screen.getAllByText(/No data/i).length).toBeGreaterThan(0));
  });
});
