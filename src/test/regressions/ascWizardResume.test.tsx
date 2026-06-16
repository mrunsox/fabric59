import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1" },
    organization: { id: "org-1", integration_configs: {} },
  }),
}));

// Mock supabase to return a persisted campaign_setups row containing ascDraft.
vi.mock("@/integrations/supabase/client", () => {
  const persistedDraft = {
    schemaVersion: 1,
    id: "draft-uuid",
    workspaceId: "ws-1",
    state: "in_progress",
    step: 2,
    stepStatus: { 1: "complete", 2: "in_progress" },
    input: {
      business: {
        description: "Resumed from DB",
        industryPresetId: "legal",
        hours: { coverage: "24x7" },
        callerPersonas: [],
        promisesToAvoid: [],
      },
      purpose: {
        primaryOutcome: "Book intake",
        blockingOutcomes: [],
        sharedAcrossClients: false,
      },
      callerReasons: [],
    },
    confidence: {},
    unresolved: [],
    rationales: {},
    forks: [],
    meta: {
      createdBy: "u-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };

  const single = vi.fn(async () => ({
    data: {
      id: "setup-123",
      intake_data: { source: "asc-wizard", ascDraft: persistedDraft },
    },
    error: null,
  }));
  const maybeSingle = single;
  const eq = vi.fn(() => ({ maybeSingle, single }));
  const select = vi.fn(() => ({ eq, single, maybeSingle }));
  const from = vi.fn(() => ({ select, insert: vi.fn(), update: vi.fn() }));

  return {
    supabase: { from },
  };
});

import AscWizardPage from "@/pages/workspace/campaigns/asc/AscWizardPage";

describe("ASC wizard resume from campaign_setups (Slice 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // dev override to keep flag on for resume
    window.localStorage.setItem("fabric59.features.ascWizard.enabled", "1");
  });

  function mount(path = "/w/ws-1/campaigns/new/assisted?setupId=setup-123") {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/w/:workspaceId/campaigns/new/assisted"
            element={<AscWizardPage />}
          />
          <Route
            path="/w/:workspaceId/campaigns/new/manual"
            element={<div data-testid="manual-page">manual</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("hydrates AscDraft from campaign_setups.intake_data.ascDraft and restores step", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByTestId("asc-step-pill").textContent).toMatch(/Step 2/);
    });
    expect(screen.getByTestId("asc-step-2")).toBeInTheDocument();
    const primary = screen.getByTestId("asc-primary-outcome") as HTMLInputElement;
    expect(primary.value).toBe("Book intake");
  });

  it("flag OFF + direct /assisted URL → redirects to /manual (wizard never mounts)", () => {
    window.localStorage.removeItem("fabric59.features.ascWizard.enabled");
    mount("/w/ws-1/campaigns/new/assisted");
    expect(screen.getByTestId("manual-page")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-shell")).not.toBeInTheDocument();
  });
});
