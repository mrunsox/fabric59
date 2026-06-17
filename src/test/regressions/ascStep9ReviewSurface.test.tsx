/**
 * ASC Slice 7 — Step 9 review surface UI states.
 *
 * Covers:
 *  - Empty state when no generated draft + "Go to Step 8" jumps.
 *  - Renders all six sections when generation is fresh.
 *  - Stale banner appears when upstream input changes; "Regenerate" jumps
 *    to Step 8; "Continue reviewing anyway" hides the banner but does NOT
 *    mutate meta.generation.stale.
 *  - "Edit in Step N" buttons in each section call onJumpToStep with the
 *    correct upstream step (no reducer mutations).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useReducer } from "react";
import { MemoryRouter } from "react-router-dom";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { AscStepReview } from "@/pages/workspace/campaigns/asc/steps";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function seed(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Acme" } });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "New matter", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "ADD_OUTCOME_EDIT",
    outcome: { id: "o1", label: "Booked" },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "internal_runner" },
  });
  return d;
}

function makeGenerated(draft: AscDraft): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(draft.input),
    flow: {
      nodes: [
        { id: "br1", kind: "reason_branch", label: "New matter", reasonId: "r1" },
        { id: "o1", kind: "outcome", label: "Booked", outcomeRef: "Booked" },
      ],
      edges: [{ id: "e1", from: "br1", to: "o1" }],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [
      { outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n1"] },
    ],
    notifications: [
      { id: "n1", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" },
    ],
    destinationLaunch: {
      destination: { kind: "internal_runner" },
      launch: { slug: "acme" },
    },
    todos: [{ id: "t1", area: "copy", message: "Write opener" }],
    confidenceByArea: { flow: { level: "low", reason: "Few branches" } },
  };
}

function Harness({
  initial,
  onJumpToStep,
}: {
  initial: AscDraft;
  onJumpToStep?: (n: number) => void;
}) {
  const [draft, dispatch] = useReducer(ascReducer, initial);
  return (
    <MemoryRouter>
      <AscStepReview
        draft={draft}
        dispatch={dispatch}
        onJumpToStep={onJumpToStep}
      />
    </MemoryRouter>
  );
}

describe("AscStepReview (Slice 7)", () => {
  it("empty state: no generated draft routes user to Step 8", () => {
    const onJump = vi.fn();
    render(<Harness initial={seed()} onJumpToStep={onJump} />);
    expect(screen.getByTestId("asc-review-empty")).toBeTruthy();
    fireEvent.click(screen.getByTestId("asc-review-goto-step8"));
    expect(onJump).toHaveBeenCalledWith(8);
  });

  it("fresh generation: renders all six review sections", () => {
    let d = seed();
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(d),
      advisories: [],
      now: "2026-06-17T00:01:00.000Z",
    });
    render(<Harness initial={d} />);
    expect(screen.getByTestId("asc-review-overview")).toBeTruthy();
    expect(screen.getByTestId("asc-review-flow-outline")).toBeTruthy();
    expect(screen.getByTestId("asc-review-outcomes")).toBeTruthy();
    expect(screen.getByTestId("asc-review-notifications")).toBeTruthy();
    expect(screen.getByTestId("asc-review-destination")).toBeTruthy();
    expect(screen.getByTestId("asc-review-todos")).toBeTruthy();
    expect(screen.queryByTestId("asc-review-stale-banner")).toBeNull();
  });

  it("stale banner: regenerate jumps to Step 8; dismiss hides banner without mutating staleness", () => {
    const onJump = vi.fn();
    let d = seed();
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(d),
      advisories: [],
      now: "2026-06-17T00:01:00.000Z",
    });
    // Upstream change → stale
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Renamed" },
    });
    expect(d.meta.generation?.stale).toBe(true);

    const { rerender } = render(
      <Harness initial={d} onJumpToStep={onJump} />,
    );
    expect(screen.getByTestId("asc-review-stale-banner")).toBeTruthy();

    fireEvent.click(screen.getByTestId("asc-review-regenerate"));
    expect(onJump).toHaveBeenCalledWith(8);

    fireEvent.click(screen.getByTestId("asc-review-dismiss-stale"));
    expect(screen.queryByTestId("asc-review-stale-banner")).toBeNull();
    // Sections remain visible (stale-but-viewable).
    expect(screen.getByTestId("asc-review-overview")).toBeTruthy();

    // Dismissal is UI-only — the underlying draft staleness must not change.
    expect(d.meta.generation?.stale).toBe(true);
    rerender(<Harness initial={d} onJumpToStep={onJump} />);
  });

  it("Edit at source: jumps to upstream steps without dispatching reducer actions", () => {
    const onJump = vi.fn();
    let d = seed();
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(d),
      advisories: [],
      now: "2026-06-17T00:01:00.000Z",
    });
    const before = JSON.stringify(d);
    render(<Harness initial={d} onJumpToStep={onJump} />);

    // Each section exposes its edit-at-source button.
    fireEvent.click(screen.getAllByTestId("asc-review-edit-step-4")[0]);
    fireEvent.click(screen.getAllByTestId("asc-review-edit-step-5")[0]);
    fireEvent.click(screen.getAllByTestId("asc-review-edit-step-6")[0]);
    fireEvent.click(screen.getAllByTestId("asc-review-edit-step-7")[0]);

    expect(onJump.mock.calls.map((c) => c[0])).toEqual([4, 5, 6, 7]);
    // Initial draft was not mutated by the edit-at-source clicks.
    expect(JSON.stringify(d)).toBe(before);
  });

  it("malformed generated subtree renders without throwing", () => {
    let d = seed();
    // Apply a deliberately partial generated payload via direct assignment in
    // a copy — exercises the section components' null-tolerance.
    const generated: AscGenerated = {
      schemaVersion: 1,
      generatedAt: "2026-06-17T00:01:00.000Z",
      inputFingerprint: computeInputFingerprint(d.input),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flow: undefined as any,
      reasonToBranch: {},
      outcomes: [],
      notifications: [],
      destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
      todos: [],
      confidenceByArea: {},
    };
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated,
      advisories: [],
      now: "2026-06-17T00:01:00.000Z",
    });
    expect(() => render(<Harness initial={d} />)).not.toThrow();
    expect(screen.getByTestId("asc-review-flow-outline")).toBeTruthy();
  });
});
