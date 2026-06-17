/**
 * Phase 5 · Slice 2 — provenance copy polish on both sides of the handoff.
 *
 * ASC wizard banner must say changes here no longer affect the canonical
 * campaign. AscOriginPanel on the canonical side must say changes here do
 * not sync back to ASC. Roundtrip link to the original ASC draft must use
 * a consistent ID.
 */
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { AscWizardShell } from "@/components/asc/AscWizardShell";
import { AscOriginPanel } from "@/components/campaigns/AscOriginPanel";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function forkedDraft(): AscDraft {
  let d = createEmptyAscDraft({
    id: "asc-draft-xyz",
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

describe("Phase 5 · Slice 2 — ASC wizard provenance copy", () => {
  it("renders the forked banner with explicit no-effect language and Forked-on/by line", () => {
    const draft = forkedDraft();
    render(
      <MemoryRouter>
        <AscWizardShell
          workspaceId="ws"
          draft={draft}
          dispatch={vi.fn()}
          autosaveStatus="saved"
          lastSavedAt="2026-06-17T00:02:00.000Z"
          onSelectStep={vi.fn()}
          onBack={vi.fn()}
          onContinue={vi.fn()}
          onHandoffToManual={() => ""}
        >
          <div>step body</div>
        </AscWizardShell>
      </MemoryRouter>,
    );
    const banner = screen.getByTestId("asc-forked-banner");
    expect(banner.textContent).toMatch(
      /changes here no longer affect the canonical campaign/i,
    );
    expect(banner.textContent).toMatch(/forked on/i);
    expect(banner.textContent).toMatch(/by user-1/i);
    const link = screen.getByTestId("asc-forked-banner-open-campaigns");
    expect(link.getAttribute("href")).toBe("/w/ws/campaigns");
  });

  it("does not render the forked banner when the draft is not forked", () => {
    const draft = createEmptyAscDraft({
      id: "d",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    render(
      <MemoryRouter>
        <AscWizardShell
          workspaceId="ws"
          draft={draft}
          dispatch={vi.fn()}
          autosaveStatus="saved"
          lastSavedAt={null}
          onSelectStep={vi.fn()}
          onBack={vi.fn()}
          onContinue={vi.fn()}
          onHandoffToManual={() => ""}
        >
          <div>step body</div>
        </AscWizardShell>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("asc-forked-banner")).not.toBeInTheDocument();
  });
});

describe("Phase 5 · Slice 2 — canonical-side provenance copy", () => {
  it("AscOriginPanel banner explicitly says changes do not sync back to ASC", () => {
    render(
      <MemoryRouter>
        <AscOriginPanel
          workspaceId="ws"
          ascOrigin={{
            ascDraftId: "asc-draft-xyz",
            forkedAt: "2026-06-17T00:02:00.000Z",
            followUps: [],
            carried: undefined,
            reviewState: { followUpsDismissedIds: [] },
          }}
          existingDispositions={[]}
          onUpdateOrigin={vi.fn()}
          onAddDispositions={vi.fn()}
        />
      </MemoryRouter>,
    );
    const copy = screen.getByTestId("asc-origin-no-sync-copy");
    expect(copy.textContent).toMatch(/changes here do not sync back to asc/i);
  });

  it("the View original ASC draft link references the same ascDraftId used by ASC", () => {
    render(
      <MemoryRouter>
        <AscOriginPanel
          workspaceId="ws"
          ascOrigin={{
            ascDraftId: "asc-draft-xyz",
            forkedAt: "2026-06-17T00:02:00.000Z",
            followUps: [],
            carried: undefined,
            reviewState: { followUpsDismissedIds: [] },
          }}
          existingDispositions={[]}
          onUpdateOrigin={vi.fn()}
          onAddDispositions={vi.fn()}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /view original asc draft/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toMatch(/asc-draft-xyz/);
    expect(href).toMatch(/\/w\/ws\//);
  });
});
