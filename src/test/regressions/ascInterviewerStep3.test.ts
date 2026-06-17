/**
 * ASC Slice 4 — Interviewer Step 3 reducer behavior.
 *
 * Covers:
 *   - APPLY_INTERVIEWER_TURN for step 3 stores the turn
 *   - CONFIRM of callerReasons.add appends a new reason
 *   - manual REMOVE between propose and confirm is fine (snapshot diverges,
 *     proposal flips stale, never writes)
 *   - REJECT flips status without writing
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { snapshotCallerReasonsLabels } from "@/lib/asc/interviewerSchema";
import type { AscDraft, AscInterviewerTurn } from "@/lib/asc/types";

function addProposalTurn(draft: AscDraft, label: string): AscInterviewerTurn {
  return {
    questionId: null,
    questionPrompt: null,
    questionTargetField: null,
    questionInputKind: null,
    proposals: [
      {
        id: "prop-1",
        targetField: "callerReasons.add",
        value: label,
        confidence: "high",
        rationale: "Common for this industry.",
        status: "pending",
        fieldSnapshot: snapshotCallerReasonsLabels(draft.input),
        issuedAt: "2026-06-16T00:00:00.000Z",
      },
    ],
    askedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("ASC Interviewer Step 3 — caller reasons (Slice 4)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-16T00:00:00.000Z",
    });
  });

  it("APPLY_INTERVIEWER_TURN for step 3 stores the turn", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: addProposalTurn(draft, "New client intake"),
    });
    expect(a.meta.interviewer?.lastTurnByStep[3]?.proposals).toHaveLength(1);
    expect(a.input.callerReasons).toHaveLength(0);
  });

  it("CONFIRM appends a new caller reason", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: addProposalTurn(draft, "New client intake"),
    });
    const b = ascReducer(a, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 3,
      proposalId: "prop-1",
    });
    expect(b.input.callerReasons).toHaveLength(1);
    expect(b.input.callerReasons[0].label).toBe("New client intake");
    expect(b.meta.interviewer?.lastTurnByStep[3]?.proposals[0].status).toBe(
      "confirmed",
    );
  });

  it("REJECT flips status without adding a reason", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: addProposalTurn(draft, "Existing client"),
    });
    const b = ascReducer(a, {
      type: "REJECT_PROPOSED_FIELD",
      step: 3,
      proposalId: "prop-1",
    });
    expect(b.input.callerReasons).toHaveLength(0);
    expect(b.meta.interviewer?.lastTurnByStep[3]?.proposals[0].status).toBe(
      "rejected",
    );
  });

  it("manual ADD before confirm makes the AI proposal stale (snapshot diverges)", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: addProposalTurn(draft, "Billing question"),
    });
    // User manually adds something else first.
    const b = ascReducer(a, {
      type: "ADD_CALLER_REASON",
      reason: {
        id: "cr-manual",
        label: "Schedule consultation",
        requiredCapture: [],
      },
    });
    const c = ascReducer(b, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 3,
      proposalId: "prop-1",
    });
    // The original "Billing question" proposal label is different from
    // anything added manually, so the duplicate guard doesn't fire — but the
    // snapshot has diverged, which makes the confirm a no-op.
    expect(c.input.callerReasons.map((r) => r.label)).toEqual([
      "Schedule consultation",
    ]);
    expect(c.meta.interviewer?.lastTurnByStep[3]?.proposals[0].status).toBe(
      "stale",
    );
  });
});
