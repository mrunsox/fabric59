import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1" }, organization: null }),
}));

import AscWizardPage from "@/pages/workspace/campaigns/asc/AscWizardPage";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";

const FLAG_KEY = "fabric59.features.ascWizard.enabled";
const ACTIVE_ID_KEY = "fabric59.asc.activeDraftId.ws-1";
const DRAFT_KEY = "fabric59.asc.draft.ws-1.persisted-draft";

describe("ASC wizard resume from persisted draft (Slice 1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(FLAG_KEY, "1");
  });

  function mount(path = "/w/ws-1/campaigns/new/assisted") {
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

  it("hydrates a persisted draft and restores its saved step + business description", () => {
    const persisted = {
      ...createEmptyAscDraft({
        id: "persisted-draft",
        workspaceId: "ws-1",
        createdBy: "u-1",
        now: "2026-01-01T00:00:00.000Z",
      }),
      step: 2,
      input: {
        ...createEmptyAscDraft({
          id: "persisted-draft",
          workspaceId: "ws-1",
          createdBy: "u-1",
        }).input,
        business: {
          description: "Resumed!",
          industryPresetId: "legal",
          hours: { coverage: "24x7" as const },
          callerPersonas: [],
        },
        purpose: {
          primaryOutcome: "Book intake",
          blockingOutcomes: [],
          sharedAcrossClients: false,
        },
      },
    };
    window.localStorage.setItem(ACTIVE_ID_KEY, "persisted-draft");
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(persisted));

    mount();

    // Step 2 body renders, and the step pill reflects the saved step.
    expect(screen.getByTestId("asc-step-pill").textContent).toMatch(/Step 2/);
    expect(screen.getByTestId("asc-step-2")).toBeInTheDocument();
    const primary = screen.getByTestId("asc-primary-outcome") as HTMLInputElement;
    expect(primary.value).toBe("Book intake");
  });

  it("flag OFF + direct /assisted URL → redirects to /manual (wizard never mounts)", () => {
    window.localStorage.removeItem(FLAG_KEY);
    mount();
    expect(screen.getByTestId("manual-page")).toBeInTheDocument();
    expect(screen.queryByTestId("asc-wizard-shell")).not.toBeInTheDocument();
  });
});
