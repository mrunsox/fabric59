/**
 * ASC Slice 4 — Side panel renders advisory gap items, with dismiss
 * removing items from view without touching draft.input.
 *
 * Phase 2: the side panel now also embeds the Business Brain suggestion
 * tray, which transitively uses AuthContext + React Query. We mock both so
 * this Slice-4 invariant test stays focused on gap items.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useReducer } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { AscDraft } from "@/lib/asc/types";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ organization: { id: "org-1" }, user: null }),
}));

vi.mock("@/lib/business-brain/flagResolver", () => ({
  useBusinessBrainFlag: () => ({ enabled: false, source: "default" }),
}));

import { AscSidePanel } from "@/components/asc/AscSidePanel";

function seedDraft(): AscDraft {
  const base = createEmptyAscDraft({
    id: "d-side",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-16T00:00:00.000Z",
  });
  const withReason = ascReducer(base, {
    type: "ADD_CALLER_REASON",
    reason: { id: "cr-1", label: "Intake", requiredCapture: [] },
  });
  const onStep3 = { ...withReason, step: 3 };
  return ascReducer(onStep3, {
    type: "APPLY_GAP_FINDER_RESULT",
    step: 3,
    now: "2026-06-16T00:01:00.000Z",
    items: [
      {
        id: "g-1",
        step: 3,
        kind: "missing_handling",
        message: "No handling for Intake.",
        reasonIds: ["cr-1"],
      },
    ],
  });
}

function Harness() {
  const [draft, dispatch] = useReducer(ascReducer, seedDraft());
  return (
    <div>
      <div data-testid="reasons-count">{draft.input.callerReasons.length}</div>
      <AscSidePanel
        draft={draft}
        dispatch={dispatch}
        workspaceId="ws"
        onApplyBbIntent={() => {}}
      />
    </div>
  );
}

describe("ASC Side panel — advisory gap items (Slice 4)", () => {
  it("renders the advisory list with non-blocking copy", () => {
    render(<Harness />);
    expect(screen.getByTestId("asc-gap-list-3")).toBeInTheDocument();
    expect(screen.getByTestId("asc-gap-item-g-1")).toHaveTextContent(
      "No handling for Intake.",
    );
    expect(
      screen.getByText(/Recommendations — not blocking/i),
    ).toBeInTheDocument();
  });

  it("dismiss hides item from UI without touching draft.input", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("asc-gap-dismiss-g-1"));
    expect(screen.queryByTestId("asc-gap-item-g-1")).not.toBeInTheDocument();
    // Caller reasons untouched.
    expect(screen.getByTestId("reasons-count")).toHaveTextContent("1");
    // Empty-state copy renders now.
    expect(screen.getByTestId("asc-gap-empty-3")).toBeInTheDocument();
  });
});
