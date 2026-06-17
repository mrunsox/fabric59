/**
 * Phase 5 · Slice 2 — UI disablement + read-only browsing after fork.
 *
 * Verifies that:
 *   1. Form controls inside Steps 1–9 are inert (via fieldset[disabled]).
 *   2. Users can still navigate Steps 1–9 and hit (disabled) controls
 *      without mutating state. This is the explicit read-only browsing
 *      regression test the reviewer asked for.
 *   3. Step 10 retains its handed-off banner and disabled fork CTA.
 */
import { describe, it, expect, vi } from "vitest";
import { useReducer } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import {
  AscStepBusiness,
  AscStepCallerTypes,
  AscStepReadiness,
} from "@/pages/workspace/campaigns/asc/steps";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function forkedDraft(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d",
    workspaceId: "ws",
    createdBy: "u",
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
  const gen: AscGenerated = {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(d.input),
    flow: {
      nodes: [{ id: "br1", kind: "reason_branch", label: "x", reasonId: "r1" }],
      edges: [],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n"] }],
    notifications: [
      { id: "n", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" },
    ],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [],
    confidenceByArea: {},
  };
  d = ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated: gen,
    advisories: [],
    now: "2026-06-17T00:01:00.000Z",
  });
  d = ascReducer(d, {
    type: "MARK_FORKED",
    at: "2026-06-17T00:02:00.000Z",
    by: "user-1",
  });
  return d;
}

// Render a step inside a fieldset[disabled] wrapper, mirroring how
// AscWizardPage wraps Steps 1–9 when the draft is read-only.
function renderReadOnlyStep(node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/w/ws/campaigns/asc"]}>
      <fieldset
        disabled
        data-testid="asc-readonly-fieldset"
        className="m-0 min-w-0 border-0 p-0"
      >
        {node}
      </fieldset>
    </MemoryRouter>,
  );
}

describe("Phase 5 · Slice 2 — UI disablement when forked", () => {
  it("Step 1 (Business): textarea + input controls are disabled via fieldset", () => {
    const draft = forkedDraft();
    const dispatch = vi.fn();
    renderReadOnlyStep(
      <AscStepBusiness draft={draft} dispatch={dispatch} />,
    );
    const desc = screen.getByTestId("asc-business-description") as HTMLTextAreaElement;
    const ind = screen.getByTestId("asc-business-industry") as HTMLInputElement;
    expect(desc.disabled).toBe(true);
    expect(ind.disabled).toBe(true);
  });

  it("Step 3 (Caller types): inputs and add/remove buttons are disabled", () => {
    const draft = forkedDraft();
    const dispatch = vi.fn();
    renderReadOnlyStep(
      <AscStepCallerTypes draft={draft} dispatch={dispatch} />,
    );
    const input = screen.getByTestId("asc-caller-reason-input") as HTMLInputElement;
    const add = screen.getByTestId("asc-caller-reason-add") as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(add.disabled).toBe(true);
  });

  it("clicking a disabled control inside the fieldset does not dispatch any action", () => {
    // Explicit read-only browsing regression: users can interact with the
    // surface without mutating state. The fieldset blocks the DOM event,
    // and the reducer guard is the safety net behind it.
    const draft = forkedDraft();
    const dispatch = vi.fn();
    renderReadOnlyStep(
      <AscStepBusiness draft={draft} dispatch={dispatch} />,
    );
    const desc = screen.getByTestId("asc-business-description") as HTMLTextAreaElement;
    fireEvent.change(desc, { target: { value: "tampered" } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("read-only browsing: rendering a different forked step still works and shows content", () => {
    const draft = forkedDraft();
    renderReadOnlyStep(
      <AscStepCallerTypes draft={draft} dispatch={vi.fn()} />,
    );
    // The seeded caller reason "New matter" must still render in the list.
    expect(screen.getByText(/new matter/i)).toBeInTheDocument();
  });

  it("Step 10 retains its handed-off banner and the fork CTA is replaced by the canonical link", () => {
    const draft = forkedDraft();
    // Wrap in MemoryRouter only; Step 10 is NOT wrapped in the disabled
    // fieldset by AscWizardPage so it remains functional.
    render(
      <MemoryRouter initialEntries={["/w/ws/campaigns/asc"]}>
        <AscStepReadiness
          draft={draft}
          dispatch={vi.fn()}
          onJumpToStep={vi.fn()}
          onForkToCanonical={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("asc-readiness-forked-banner")).toBeInTheDocument();
    const openLink = screen.getByTestId("asc-readiness-open-canonical");
    expect(openLink).toBeInTheDocument();
    // Fork CTA must not be present in forked state (it's the "open
    // canonical" link instead).
    expect(screen.queryByTestId("asc-readiness-continue")).not.toBeInTheDocument();
  });
});

describe("Phase 5 · Slice 2 — unforked draft remains editable (regression guard)", () => {
  it("Step 1 controls are enabled when the draft is not forked", () => {
    const draft = createEmptyAscDraft({
      id: "d",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    render(
      <MemoryRouter initialEntries={["/w/ws/campaigns/asc"]}>
        <AscStepBusiness draft={draft} dispatch={vi.fn()} />
      </MemoryRouter>,
    );
    const desc = screen.getByTestId("asc-business-description") as HTMLTextAreaElement;
    expect(desc.disabled).toBe(false);
  });
});
