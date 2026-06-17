/**
 * ASC Slice 4 — explicit duplicate-reason guard.
 *
 * If the AI proposes a callerReasons.add whose normalized label matches an
 * existing reason, CONFIRM must NOT blindly create a duplicate. The
 * proposal flips to stale and the reason list is unchanged.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { snapshotCallerReasonsLabels } from "@/lib/asc/interviewerSchema";
import type { AscDraft, AscInterviewerTurn } from "@/lib/asc/types";

function proposalForLabel(draft: AscDraft, label: string): AscInterviewerTurn {
  return {
    questionId: null,
    questionPrompt: null,
    questionTargetField: null,
    questionInputKind: null,
    proposals: [
      {
        id: "prop-dup",
        targetField: "callerReasons.add",
        value: label,
        confidence: "high",
        rationale: "Model suggestion.",
        status: "pending",
        fieldSnapshot: snapshotCallerReasonsLabels(draft.input),
        issuedAt: "2026-06-16T00:00:00.000Z",
      },
    ],
    askedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("ASC Slice 4 — duplicate-reason guard", () => {
  it("CONFIRM does not create a duplicate when normalized label matches", () => {
    // Seed an existing reason "New Client Intake".
    let draft: AscDraft = createEmptyAscDraft({
      id: "d-dup",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-16T00:00:00.000Z",
    });
    draft = ascReducer(draft, {
      type: "ADD_CALLER_REASON",
      reason: {
        id: "cr-existing",
        label: "New Client Intake",
        requiredCapture: [],
      },
    });
    // AI proposes a near-duplicate ("new   client intake" with case/spacing).
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: proposalForLabel(draft, "new   client intake"),
    });
    const b = ascReducer(a, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 3,
      proposalId: "prop-dup",
    });
    expect(b.input.callerReasons).toHaveLength(1);
    expect(b.input.callerReasons[0].id).toBe("cr-existing");
    expect(b.meta.interviewer?.lastTurnByStep[3]?.proposals[0].status).toBe(
      "stale",
    );
  });

  it("ADD_CALLER_REASON also stales matching pending proposals", () => {
    const draft = createEmptyAscDraft({
      id: "d-dup2",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-16T00:00:00.000Z",
    });
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 3,
      turn: proposalForLabel(draft, "Billing question"),
    });
    // User manually adds the same label themselves before confirming.
    const b = ascReducer(a, {
      type: "ADD_CALLER_REASON",
      reason: {
        id: "cr-manual",
        label: "BILLING QUESTION",
        requiredCapture: [],
      },
    });
    expect(b.meta.interviewer?.lastTurnByStep[3]?.proposals[0].status).toBe(
      "stale",
    );
  });
});
