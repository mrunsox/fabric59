import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1" }, organization: null }),
}));

import AscWizardPage from "@/pages/workspace/campaigns/asc/AscWizardPage";

const FLAG_KEY = "fabric59.features.ascWizard.enabled";

function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="location" data-pathname={loc.pathname} data-search={loc.search}>
      {loc.pathname}
      {loc.search}
    </div>
  );
}

describe("ASC wizard shell smoke (Slice 1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(FLAG_KEY, "1");
  });

  function mount() {
    return render(
      <MemoryRouter initialEntries={["/w/ws-1/campaigns/new/assisted"]}>
        <Routes>
          <Route
            path="/w/:workspaceId/campaigns/new/assisted"
            element={<AscWizardPage />}
          />
          <Route
            path="/w/:workspaceId/campaigns/new/manual"
            element={<LocationProbe />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("renders the shell, the stepper with all 10 steps, and the side-panel tabs", () => {
    mount();
    expect(screen.getByTestId("asc-wizard-shell")).toBeInTheDocument();
    expect(screen.getByTestId("asc-side-panel")).toBeInTheDocument();
    for (let s = 1; s <= 10; s++) {
      expect(screen.getByTestId(`asc-stepper-item-${s}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("asc-switch-to-manual")).toBeInTheDocument();
  });

  it("Continue gates on Step 1 business description and advances when filled", () => {
    mount();
    const cont = screen.getByTestId("asc-footer-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("asc-business-description"), {
      target: { value: "We answer phones for dentists." },
    });
    expect((screen.getByTestId("asc-footer-continue") as HTMLButtonElement).disabled).toBe(false);
  });

  it("Switch to manual navigates to the manual route preserving seedFromAsc", () => {
    mount();
    fireEvent.click(screen.getByTestId("asc-switch-to-manual"));
    fireEvent.click(screen.getByTestId("asc-switch-to-manual-confirm"));
    const loc = screen.getByTestId("location");
    expect(loc.getAttribute("data-pathname")).toBe(
      "/w/ws-1/campaigns/new/manual",
    );
    expect(loc.getAttribute("data-search")).toMatch(/seedFromAsc=/);
  });
});
