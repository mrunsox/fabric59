import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BrainVerticalGovernanceSection from "@/pages/workspace/brain/BrainVerticalGovernanceSection";
import type { BbVerticalCoverage, BbVerticalGap, VerticalProfile } from "@/lib/business-brain/types";

const profile: VerticalProfile = {
  id: "p1",
  slug: "local_gov",
  label: "Local Government",
  description: null,
};

const coverage: BbVerticalCoverage[] = [
  {
    workspaceId: "ws-1",
    verticalProfileId: "p1",
    entityType: "service",
    requiredCount: 3,
    actualCount: 2,
    coverageRatio: 0.66,
    highPriority: false,
    lastComputedAt: new Date().toISOString(),
  },
  {
    workspaceId: "ws-1",
    verticalProfileId: "p1",
    entityType: "hours",
    requiredCount: 1,
    actualCount: 0,
    coverageRatio: 0,
    highPriority: true,
    lastComputedAt: new Date().toISOString(),
  },
];

const gaps: BbVerticalGap[] = [
  {
    id: "g1",
    workspaceId: "ws-1",
    verticalProfileId: "p1",
    entityType: "hours",
    gapKind: "under_min_count",
    factId: null,
    fieldPath: null,
    validationHint: null,
    status: "open",
    highPriority: true,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    suppressedAt: null,
  },
];

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ organization: { id: "org-1" } }),
}));
vi.mock("@/lib/business-brain/selectors", () => ({
  getWorkspaceVerticalProfile: vi.fn(async () => profile),
  getVerticalCoverageSummary: vi.fn(async () => coverage),
  listVerticalGaps: vi.fn(async () => gaps),
  suppressVerticalGap: vi.fn(async () => true),
  triggerVerticalEvaluation: vi.fn(async () => ({ ok: true })),
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/w/ws-1/brain/governance"]}>
        <Routes>
          <Route path="/w/:workspaceId/brain/governance" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BrainVerticalGovernanceSection", () => {
  it("renders coverage cards and gap rows with high-priority indicator", async () => {
    render(wrap(<BrainVerticalGovernanceSection />));
    expect(await screen.findByText(/Coverage & gaps/i)).toBeTruthy();
    // vertical label
    expect(await screen.findByText(/Local Government/)).toBeTruthy();
    // coverage entity labels
    expect(await screen.findByText(/^Service$/)).toBeTruthy();
    expect(await screen.findByText(/^Hours$/)).toBeTruthy();
    // gap row + actions
    expect(await screen.findByText(/Under required count/i)).toBeTruthy();
    expect(await screen.findByText(/Go fix/i)).toBeTruthy();
    expect(await screen.findByText(/Suppress/i)).toBeTruthy();
  });
});
