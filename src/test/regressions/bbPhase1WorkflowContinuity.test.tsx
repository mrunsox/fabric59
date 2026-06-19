/**
 * Phase 1 — Workflow continuity from gap → fact draft.
 *
 * Locks in that BbGapDrawer's "Edit fact" deep-link threads a
 * `from=gap:<factId>` query param so the destination can render a back-chip.
 */
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BbGapDrawer from "@/components/business-brain/BbGapDrawer";

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

describe("BbGapDrawer — workflow continuity", () => {
  it("threads from=gap:<factId> when navigating to the fact editor", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/w/ws-1/brain/governance"]}>
        <Routes>
          <Route
            path="/w/:workspaceId/brain/governance"
            element={
              <BbGapDrawer
                factId="fact-123"
                factDisplayName="Office hours"
                gaps={[]}
                open
                onClose={() => {}}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(getByTestId("bb-gap-drawer-edit-fact"));
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const url = navigateSpy.mock.calls[0][0] as string;
    expect(url).toContain("/w/ws-1/brain/approved");
    expect(url).toContain("fact=fact-123");
    expect(url).toContain("from=gap:fact-123");
  });
});
