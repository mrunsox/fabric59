/**
 * Phase 7 — Governance UI smoke test for the Demand gaps section.
 *
 * Confirms:
 *   - lists gap topics from the selector
 *   - never renders raw_query (raw text never enters this surface)
 *   - reviewer actions invoke selector helpers
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const dismissMock = vi.fn(async () => true);
const suppressMock = vi.fn(async () => true);
const triggerMock = vi.fn(async () => ({ ok: true }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ organization: { id: "org-1" } }),
}));

vi.mock("@/lib/business-brain/selectors", () => ({
  listGapTopics: vi.fn(async () => [
    {
      id: "gt-1",
      workspaceId: "ws-1",
      canonicalQuestion: "what are your hours",
      entityTypeHint: "hours",
      verticalRequirementHint: "service_has_hours",
      openEventCount: 7,
      channels: ["search", "assist"],
      status: "open",
      statusReason: null,
      linkedFactId: null,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ]),
  dismissGapTopic: dismissMock,
  suppressGapTopic: suppressMock,
  triggerGapClusterRun: triggerMock,
  buildFactDraftLinkFromGap: () => "/w/ws-1/brain/approved?newDraft=1",
}));

import BrainGapGovernanceSection from "@/pages/workspace/brain/BrainGapGovernanceSection";

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/w/ws-1/brain/governance"]}>
        <Routes>
          <Route path="/w/:workspaceId/brain/governance" element={<BrainGapGovernanceSection />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("bbGapGovernanceUi", () => {
  beforeEach(() => {
    dismissMock.mockClear();
    suppressMock.mockClear();
    triggerMock.mockClear();
  });

  it("renders canonical question + hints and reviewer actions", async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText("what are your hours")).toBeInTheDocument();
    });
    expect(screen.getByText(/hint: hours/)).toBeInTheDocument();
    expect(screen.getByText(/service_has_hours/)).toBeInTheDocument();
    expect(screen.getByText(/7 signals/)).toBeInTheDocument();
  });

  it("invokes suppress and dismiss selectors on click", async () => {
    renderSection();
    await waitFor(() => screen.getByText("what are your hours"));
    fireEvent.click(screen.getByRole("button", { name: /Suppress/i }));
    await waitFor(() => expect(suppressMock).toHaveBeenCalledWith("gt-1"));
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith("gt-1"));
  });

  it("never renders raw query text fields", async () => {
    renderSection();
    await waitFor(() => screen.getByText("what are your hours"));
    expect(screen.queryByText(/raw_query/i)).toBeNull();
  });
});
