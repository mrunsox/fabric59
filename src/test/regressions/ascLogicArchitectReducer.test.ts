/**
 * ASC Slice 5 — Logic Architect reducer lifecycle.
 *
 * Covers:
 *   - APPLY/CONFIRM/REJECT for Step 5 outcomes
 *   - Duplicate outcome confirm is a no-op write but flips status
 *   - Manual ADD_OUTCOME_EDIT after proposal stales matching pending proposal
 *   - Cross-step regression: ADD_CALLER_REASON marks pending Step 5/6
 *     proposals stale (proposals must not be silently trusted as current)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { snapshotForLaProposal } from "@/lib/asc/logicArchitectSchema";
import type { AscDraft, AscLogicArchitectProposal } from "@/lib/asc/types";

function laProposal(
  draft: AscDraft,
  overrides: Partial<AscLogicArchitectProposal> = {},
): AscLogicArchitectProposal {
  return {
    id: "la-1",
    step: 5,
    targetField: "outcomes.add",
    value: { label: "Booked consult", kind: "success" },
    confidence: "high",
    rationale: "Matches purpose.",
    status: "pending",
    fieldSnapshot: snapshotForLaProposal(draft.input, "outcomes.add"),
    issuedAt: "2026-06-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("ASC Logic Architect reducer (Slice 5)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
  });

  it("APPLY_LOGIC_ARCHITECT_RESULT stores proposals + advisories", () => {
    const next = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [laProposal(draft)],
      advisories: [{ message: "Catalog is empty." }],
      now: "2026-06-17T00:00:01.000Z",
    });
    expect(next.meta.logicArchitect?.proposalsByStep[5]).toHaveLength(1);
    expect(next.meta.logicArchitect?.advisoriesByStep[5]).toHaveLength(1);
    expect(draft.input.outcomesDraftEdits ?? []).toHaveLength(0);
  });

  it("CONFIRM writes the outcome and flips status to confirmed", () => {
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [laProposal(draft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 5,
      proposalId: "la-1",
    });
    expect(b.input.outcomesDraftEdits).toHaveLength(1);
    expect(b.input.outcomesDraftEdits?.[0].label).toBe("Booked consult");
    expect(b.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe(
      "confirmed",
    );
  });

  it("Duplicate outcome confirm is a no-op write but flips status", () => {
    // Manually add the same outcome first
    const seeded = ascReducer(draft, {
      type: "ADD_OUTCOME_EDIT",
      outcome: { id: "oc-x", label: "Booked Consult" },
    });
    // Propose the same label (snapshot reflects current outcomes list)
    const proposal = laProposal(seeded);
    const a = ascReducer(seeded, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [proposal],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 5,
      proposalId: "la-1",
    });
    expect(b.input.outcomesDraftEdits).toHaveLength(1); // no duplicate
    expect(b.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe(
      "confirmed",
    );
  });

  it("Manual ADD_OUTCOME_EDIT matching a pending proposal stales it", () => {
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [laProposal(draft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "ADD_OUTCOME_EDIT",
      outcome: { id: "oc-x", label: "booked consult" }, // matches normalized
    });
    expect(b.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe("stale");
  });

  it("REJECT flips status without writing", () => {
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [laProposal(draft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "REJECT_LOGIC_ARCHITECT_PROPOSAL",
      step: 5,
      proposalId: "la-1",
    });
    expect(b.input.outcomesDraftEdits ?? []).toHaveLength(0);
    expect(b.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe(
      "rejected",
    );
  });

  // ── Cross-step stale regression ─────────────────────────────────────────
  it(
    "ADD_CALLER_REASON stales pending Step 5 AND Step 6 LA proposals",
    () => {
      const step5 = laProposal(draft, { id: "la-5", step: 5 });
      const step6 = laProposal(draft, {
        id: "la-6",
        step: 6,
        targetField: "notifications.add",
        value: {
          outcomeRef: "Booked consult",
          channelRef: "slack:#x",
          urgency: "normal",
        },
        fieldSnapshot: snapshotForLaProposal(draft.input, "notifications.add"),
      });
      let state = ascReducer(draft, {
        type: "APPLY_LOGIC_ARCHITECT_RESULT",
        step: 5,
        proposals: [step5],
        advisories: [],
        now: "2026-06-17T00:00:01.000Z",
      });
      state = ascReducer(state, {
        type: "APPLY_LOGIC_ARCHITECT_RESULT",
        step: 6,
        proposals: [step6],
        advisories: [],
        now: "2026-06-17T00:00:02.000Z",
      });
      // Material Step 3 change
      const after = ascReducer(state, {
        type: "ADD_CALLER_REASON",
        reason: { id: "cr-new", label: "Emergency", requiredCapture: [] },
      });
      expect(after.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe(
        "stale",
      );
      expect(after.meta.logicArchitect?.proposalsByStep[5]?.[0].staleReason).toBe(
        "cross_step_input_changed",
      );
      expect(after.meta.logicArchitect?.proposalsByStep[6]?.[0].status).toBe(
        "stale",
      );
    },
  );

  it("UPDATE_PURPOSE also stales pending Step 5/6 LA proposals", () => {
    const step5 = laProposal(draft);
    const state = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 5,
      proposals: [step5],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const after = ascReducer(state, {
      type: "UPDATE_PURPOSE",
      patch: { primaryOutcome: "Different goal" },
    });
    expect(after.meta.logicArchitect?.proposalsByStep[5]?.[0].status).toBe(
      "stale",
    );
  });
});
