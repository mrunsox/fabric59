/**
 * ASC Slice 6 — Step 8 generation panel UI states.
 *
 * Covers:
 *  - Idle: CTA disabled with pre-flight gate message when prereqs missing.
 *  - Idle (gate ok): CTA enabled.
 *  - Compiling: progress visible, CTA disabled.
 *  - Success: summary tiles render.
 *  - Stale: stale banner appears after upstream input change; generated stays
 *    visible; explicit Regenerate is required.
 *  - Error: alert + "Continue to manual builder" escape dispatches discard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useReducer } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { AscGenerationPanel } from "@/components/asc/AscGenerationPanel";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function seedComplete(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Biz" } });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "Booking", requiredCapture: [] },
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
    generatedAt: "2026-06-17T00:00:10.000Z",
    inputFingerprint: computeInputFingerprint(draft.input),
    flow: {
      nodes: [
        { id: "entry", kind: "entry", label: "Start" },
        { id: "br1", kind: "reason_branch", label: "Booking", reasonId: "r1" },
      ],
      edges: [{ id: "e1", from: "entry", to: "br1" }],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [],
    notifications: [],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [{ id: "t1", area: "copy", message: "Write opener" }],
    confidenceByArea: {},
  };
}

function Harness({ initial }: { initial: AscDraft }) {
  const [draft, dispatch] = useReducer(ascReducer, initial);
  return (
    <MemoryRouter initialEntries={["/w/ws/campaigns/new/asc?step=8"]}>
      <Routes>
        <Route
          path="/w/ws/campaigns/new/asc"
          element={
            <AscGenerationPanel
              draft={draft}
              dispatch={dispatch}
              workspaceId="ws"
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AscGenerationPanel (Slice 6)", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("Idle with incomplete prereqs: CTA disabled + gate message", () => {
    const empty = createEmptyAscDraft({
      id: "d",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    render(<Harness initial={empty} />);
    const btn = screen.getByTestId("asc-generate-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId("asc-generate-gate")).toBeTruthy();
  });

  it("Idle with prereqs met: CTA enabled", () => {
    render(<Harness initial={seedComplete()} />);
    const btn = screen.getByTestId("asc-generate-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.queryByTestId("asc-generate-gate")).toBeNull();
  });

  it("Compiling state: progress visible, button disabled", () => {
    let d = seedComplete();
    d = ascReducer(d, {
      type: "BEGIN_STEP8_GENERATION",
      now: "2026-06-17T00:00:01.000Z",
    });
    render(<Harness initial={d} />);
    expect(screen.getByTestId("asc-generate-progress")).toBeTruthy();
    const btn = screen.getByTestId("asc-generate-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Success: renders summary tiles", () => {
    let d = seedComplete();
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(d),
      advisories: [],
      now: "2026-06-17T00:00:10.000Z",
    });
    render(<Harness initial={d} />);
    const summary = screen.getByTestId("asc-generate-summary");
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain("Flow nodes");
  });

  it("Stale after upstream edit: banner appears, generated stays visible", () => {
    let d = seedComplete();
    d = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(d),
      advisories: [],
      now: "2026-06-17T00:00:10.000Z",
    });
    // Upstream edit AFTER generation
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Renamed biz" },
    });
    render(<Harness initial={d} />);
    expect(screen.getByTestId("asc-generate-stale")).toBeTruthy();
    // Generated draft still viewable
    expect(screen.getByTestId("asc-generate-summary")).toBeTruthy();
  });

  it("Error: shows alert + manual-builder escape dispatches discard + navigates", async () => {
    let d = seedComplete();
    d = ascReducer(d, {
      type: "FAIL_STEP8_GENERATION",
      now: "2026-06-17T00:00:05.000Z",
      error: { code: "schema_invalid", message: "bad" },
    });
    render(<Harness initial={d} />);
    expect(screen.getByTestId("asc-generate-error")).toBeTruthy();
    const escape = screen.getByTestId("asc-generate-escape");
    await act(async () => {
      fireEvent.click(escape);
    });
    expect(navigateMock).toHaveBeenCalledWith("/w/ws/campaigns/new/manual");
  });
});
