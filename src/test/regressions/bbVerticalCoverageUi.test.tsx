import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BbGapDrawer from "@/components/business-brain/BbGapDrawer";
import type { BbVerticalGap } from "@/lib/business-brain/types";

const gaps: BbVerticalGap[] = [
  {
    id: "g1",
    workspaceId: "ws-1",
    verticalProfileId: "p1",
    entityType: "service",
    gapKind: "missing_field",
    factId: "f1",
    fieldPath: "payload.name",
    validationHint: "Service must have a display name",
    status: "open",
    highPriority: false,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    suppressedAt: null,
  },
];

function wrap(ui: React.ReactElement) {
  return (
    <MemoryRouter initialEntries={["/w/ws-1/brain/approved"]}>
      <Routes>
        <Route path="/w/:workspaceId/brain/approved" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BbGapDrawer (vertical coverage)", () => {
  it("renders unmet vertical requirements with hint and entity label", () => {
    render(
      wrap(
        <BbGapDrawer
          factId="f1"
          factDisplayName="Trash pickup"
          gaps={gaps}
          open
          onClose={() => {}}
        />,
      ),
    );
    expect(screen.getByText(/Vertical gaps/i)).toBeTruthy();
    expect(screen.getByText(/Trash pickup/)).toBeTruthy();
    expect(screen.getByText(/Service must have a display name/)).toBeTruthy();
    expect(screen.getByText(/Missing field/)).toBeTruthy();
    expect(screen.getByText(/Edit fact/)).toBeTruthy();
  });

  it("filters gaps to the active fact only", () => {
    const other: BbVerticalGap = { ...gaps[0], id: "g2", factId: "other" };
    render(
      wrap(
        <BbGapDrawer
          factId="f1"
          factDisplayName="Trash pickup"
          gaps={[...gaps, other]}
          open
          onClose={() => {}}
        />,
      ),
    );
    // Only one rendered (the one matching f1)
    const hits = screen.getAllByText(/Service must have a display name/);
    expect(hits).toHaveLength(1);
  });

  it("renders empty state when fact has no open gaps", () => {
    render(
      wrap(
        <BbGapDrawer
          factId="other"
          factDisplayName="Other"
          gaps={gaps}
          open
          onClose={() => {}}
        />,
      ),
    );
    expect(screen.getByText(/No open gaps for this fact/i)).toBeTruthy();
  });
});
