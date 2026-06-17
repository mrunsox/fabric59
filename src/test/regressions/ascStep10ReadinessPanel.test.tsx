/**
 * ASC Slice 8 — Step 10 readiness panel UI states.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useReducer } from "react";
import { MemoryRouter } from "react-router-dom";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { AscStepReadiness } from "@/pages/workspace/campaigns/asc/steps";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function seedReady(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Acme" } });
  d = ascReducer(d, { type: "UPDATE_PURPOSE", patch: { primaryOutcome: "Book" } });
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

function gen(d: AscDraft, overrides?: Partial<AscGenerated>): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(d.input),
    flow: {
      nodes: [{ id: "br1", kind: "reason_branch", label: "x", reasonId: "r1" }],
      edges: [],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n"] }],
    notifications: [{ id: "n", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" }],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [],
    confidenceByArea: {},
    ...overrides,
  };
}

function applyGen(d: AscDraft, g: AscGenerated): AscDraft {
  return ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated: g,
    advisories: [],
    now: "2026-06-17T00:01:00.000Z",
  });
}

function Harness({
  initial,
  onJumpToStep,
  onForkToCanonical,
}: {
  initial: AscDraft;
  onJumpToStep?: (n: number) => void;
  onForkToCanonical?: () => void;
}) {
  const [draft, dispatch] = useReducer(ascReducer, initial);
  return (
    <MemoryRouter initialEntries={["/w/ws/campaigns/new/asc"]}>
      <AscStepReadiness
        draft={draft}
        dispatch={dispatch}
        onJumpToStep={onJumpToStep}
        onForkToCanonical={onForkToCanonical}
      />
    </MemoryRouter>
  );
}

describe("AscStepReadiness (Slice 8)", () => {
  it("shows blockers and disables the CTA when not ready", () => {
    const d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const onFork = vi.fn();
    render(<Harness initial={d} onForkToCanonical={onFork} />);
    expect(screen.getByTestId("asc-readiness-blockers")).toBeTruthy();
    const cta = screen.getByTestId("asc-readiness-continue") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    fireEvent.click(cta);
    expect(onFork).not.toHaveBeenCalled();
  });

  it("enables the CTA when ready and invokes onForkToCanonical", () => {
    let d = seedReady();
    d = applyGen(d, gen(d));
    const onFork = vi.fn();
    render(<Harness initial={d} onForkToCanonical={onFork} />);
    const cta = screen.getByTestId("asc-readiness-continue") as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
    fireEvent.click(cta);
    expect(onFork).toHaveBeenCalledTimes(1);
  });

  it("edit-at-source button calls onJumpToStep with the issue's step", () => {
    const d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const onJump = vi.fn();
    render(<Harness initial={d} onJumpToStep={onJump} />);
    // no_caller_reasons jumps to 3
    fireEvent.click(
      screen.getByTestId("asc-readiness-issue-no_caller_reasons-jump"),
    );
    expect(onJump).toHaveBeenCalledWith(3);
  });

  it("stale generation re-disables the CTA after an upstream edit", () => {
    let d = seedReady();
    d = applyGen(d, gen(d));
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Acme (revised)" },
    });
    render(<Harness initial={d} />);
    const cta = screen.getByTestId("asc-readiness-continue") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    expect(
      screen.getByTestId("asc-readiness-issue-generation_stale"),
    ).toBeTruthy();
  });

  it("already-forked draft hides the CTA and shows the handed-off banner", () => {
    let d = seedReady();
    d = applyGen(d, gen(d));
    d = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:02:00.000Z",
      by: "u",
    });
    render(<Harness initial={d} onForkToCanonical={vi.fn()} />);
    expect(screen.queryByTestId("asc-readiness-continue")).toBeNull();
    expect(screen.getByTestId("asc-readiness-forked-banner")).toBeTruthy();
    expect(screen.getByTestId("asc-readiness-open-canonical")).toBeTruthy();
  });
});
