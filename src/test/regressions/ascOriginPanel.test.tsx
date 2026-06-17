/**
 * Phase 5 · Slice 1 — AscOriginPanel UI behaviors.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AscOriginPanel } from "@/components/campaigns/AscOriginPanel";
import type { CampaignIntakeData } from "@/types/campaign";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u" }, organization: { id: "o" } }),
}));

const baseOrigin: NonNullable<CampaignIntakeData["ascOrigin"]> = {
  ascDraftId: "asc-99",
  forkedAt: "2026-06-17T00:00:00.000Z",
  carried: {
    primaryOutcome: "Book service call",
    callerReasons: [
      { id: "r1", label: "New service" },
      { id: "r2", label: "Existing customer" },
    ],
    destination: { kind: "internal_runner" },
    launchSlug: "acme-intake",
  },
  followUps: [
    { id: "t1", area: "copy", message: "Write opener" },
    { id: "t2", area: "flow", message: "Confirm escalation rule" },
  ],
  reviewState: { followUpsDismissedIds: [] },
};

describe("AscOriginPanel", () => {
  it("renders banner, carried context, and follow-ups", () => {
    render(
      <AscOriginPanel
        workspaceId="ws"
        ascOrigin={baseOrigin}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    expect(screen.getByText(/Handed off from ASC/)).toBeInTheDocument();
    expect(screen.getByText(/ASC did not publish/)).toBeInTheDocument();
    expect(screen.getByText(/Book service call/)).toBeInTheDocument();
    expect(screen.getByText("New service")).toBeInTheDocument();
    expect(screen.getByText("acme-intake")).toBeInTheDocument();
    expect(screen.getByTestId("asc-followup-t1")).toBeInTheDocument();
    expect(screen.getByTestId("asc-followup-t2")).toBeInTheDocument();
  });

  it("'Add as new disposition candidates' is additive and dedupes case-insensitively", () => {
    const onAdd = vi.fn();
    render(
      <AscOriginPanel
        workspaceId="ws"
        ascOrigin={baseOrigin}
        existingNewDispositions={["new service"]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={onAdd}
      />,
    );
    fireEvent.click(screen.getByTestId("asc-insert-dispositions"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(["Existing customer"]);
  });

  it("does NOT overwrite existing dispositions when all carried labels are duplicates", () => {
    const onAdd = vi.fn();
    render(
      <AscOriginPanel
        workspaceId="ws"
        ascOrigin={baseOrigin}
        existingNewDispositions={["New service", "Existing customer"]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={onAdd}
      />,
    );
    fireEvent.click(screen.getByTestId("asc-insert-dispositions"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("dismissing a follow-up updates reviewState only (not domain semantics)", () => {
    const onUpdate = vi.fn();
    render(
      <AscOriginPanel
        workspaceId="ws"
        ascOrigin={baseOrigin}
        existingNewDispositions={[]}
        onUpdateAscOrigin={onUpdate}
        onAddNewDispositions={() => {}}
      />,
    );
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const next = onUpdate.mock.calls[0][0];
    expect(next.reviewState.followUpsDismissedIds).toContain("t1");
    // carried + followUps untouched.
    expect(next.carried).toEqual(baseOrigin.carried);
    expect(next.followUps).toEqual(baseOrigin.followUps);
    expect(next.ascDraftId).toBe(baseOrigin.ascDraftId);
    expect(next.forkedAt).toBe(baseOrigin.forkedAt);
  });

  it("renders banner even when there is no carried context", () => {
    render(
      <AscOriginPanel
        workspaceId="ws"
        ascOrigin={{
          ascDraftId: "asc-empty",
          forkedAt: baseOrigin.forkedAt,
          reviewState: { followUpsDismissedIds: [] },
        }}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    expect(screen.getByText(/Handed off from ASC/)).toBeInTheDocument();
    expect(screen.queryByText(/Carried from ASC/)).not.toBeInTheDocument();
  });
});
