/**
 * ASC Slice 3 — Interviewer reducer behavior.
 *
 * Pure-reducer tests. Covers:
 *   - APPLY_INTERVIEWER_TURN stores turn under meta.interviewer
 *   - CONFIRM writes through to the right input slot
 *   - REJECT flips status without writing
 *   - Already-confirmed fields are not re-asked (nextQuestion stripped)
 *   - Manual UPDATE_BUSINESS / UPDATE_PURPOSE marks pending proposals stale
 *   - Manual edit wins over stale Confirm (the explicit scope-lock test)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { serializeFieldValue } from "@/lib/asc/interviewerSchema";
import type { AscDraft, AscInterviewerTurn } from "@/lib/asc/types";

function turnWithProposal(
  draft: AscDraft,
  targetField: Parameters<typeof serializeFieldValue>[0] extends infer _
    ? string
    : never,
  value: string,
  questionTargetField?: string,
): AscInterviewerTurn {
  return {
    questionId: questionTargetField ? "q-1" : null,
    questionPrompt: questionTargetField ? "What is X?" : null,
    questionTargetField: questionTargetField as never,
    questionInputKind: questionTargetField ? "text" : null,
    proposals: [
      {
        id: "prop-1",
        targetField: targetField as never,
        value,
        confidence: "medium",
        rationale: "because",
        status: "pending",
        fieldSnapshot: serializeFieldValue(""),
        issuedAt: "2026-06-16T00:00:00.000Z",
      },
    ],
    askedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("ASC Interviewer reducer (Slice 3)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-16T00:00:00.000Z",
    });
  });

  it("APPLY_INTERVIEWER_TURN stores the turn under meta.interviewer", () => {
    const turn = turnWithProposal(
      draft,
      "business.industryPresetId",
      "legal",
      "business.industryPresetId",
    );
    const next = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn });
    expect(next.meta.interviewer?.lastTurnByStep[1]?.questionPrompt).toBe("What is X?");
    expect(next.meta.interviewer?.lastTurnByStep[1]?.proposals).toHaveLength(1);
    // Phase 2 input contract is untouched.
    expect(next.input.business.industryPresetId).toBe("general");
  });

  it("CONFIRM_PROPOSED_FIELD writes through to input.business", () => {
    const turn = turnWithProposal(draft, "business.industryPresetId", "legal");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn });
    const b = ascReducer(a, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 1,
      proposalId: "prop-1",
    });
    expect(b.input.business.industryPresetId).toBe("legal");
    expect(b.meta.interviewer?.confirmedFields).toContain("business.industryPresetId");
    expect(b.meta.interviewer?.lastTurnByStep[1]?.proposals[0].status).toBe("confirmed");
  });

  it("CONFIRM_PROPOSED_FIELD writes through to input.purpose for step 2", () => {
    const turn = turnWithProposal(draft, "purpose.secondaryOutcome", "Lead capture");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 2, turn });
    const b = ascReducer(a, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 2,
      proposalId: "prop-1",
    });
    expect(b.input.purpose.secondaryOutcome).toBe("Lead capture");
  });

  it("REJECT_PROPOSED_FIELD flips status to rejected without writing", () => {
    const turn = turnWithProposal(draft, "business.industryPresetId", "legal");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn });
    const b = ascReducer(a, {
      type: "REJECT_PROPOSED_FIELD",
      step: 1,
      proposalId: "prop-1",
    });
    expect(b.input.business.industryPresetId).toBe("general");
    expect(b.meta.interviewer?.lastTurnByStep[1]?.proposals[0].status).toBe("rejected");
  });

  it("already-confirmed fields are not re-asked (nextQuestion stripped)", () => {
    // First confirm a field.
    const turnA = turnWithProposal(
      draft,
      "business.industryPresetId",
      "legal",
      "business.industryPresetId",
    );
    const a1 = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn: turnA });
    const a2 = ascReducer(a1, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 1,
      proposalId: "prop-1",
    });
    // Model tries to ask about the same field again.
    const turnB: AscInterviewerTurn = {
      questionId: "q-2",
      questionPrompt: "What industry is the business in?",
      questionTargetField: "business.industryPresetId",
      questionInputKind: "text",
      proposals: [],
      askedAt: "2026-06-16T00:01:00.000Z",
    };
    const b = ascReducer(a2, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn: turnB });
    expect(b.meta.interviewer?.lastTurnByStep[1]?.questionPrompt).toBeNull();
    expect(b.meta.interviewer?.lastTurnByStep[1]?.questionTargetField).toBeNull();
  });

  it("manual edit marks pending proposals for the same field as stale", () => {
    const turn = turnWithProposal(draft, "business.industryPresetId", "legal");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn });
    const b = ascReducer(a, {
      type: "UPDATE_BUSINESS",
      patch: { industryPresetId: "medical" },
    });
    expect(b.input.business.industryPresetId).toBe("medical");
    expect(b.meta.interviewer?.lastTurnByStep[1]?.proposals[0].status).toBe("stale");
  });

  // The explicit scope-lock test:
  it("manual input wins over a stale CONFIRM (manual edit after proposal)", () => {
    const turn = turnWithProposal(draft, "business.industryPresetId", "legal");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn });
    // User manually overrides the field after the proposal was issued.
    const b = ascReducer(a, {
      type: "UPDATE_BUSINESS",
      patch: { industryPresetId: "medical" },
    });
    // Then the user clicks Confirm on the stale chip.
    const c = ascReducer(b, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 1,
      proposalId: "prop-1",
    });
    // The manual value must NOT be overwritten.
    expect(c.input.business.industryPresetId).toBe("medical");
    // And the proposal must not flip to confirmed.
    expect(c.meta.interviewer?.lastTurnByStep[1]?.proposals[0].status).not.toBe(
      "confirmed",
    );
    expect(c.meta.interviewer?.confirmedFields ?? []).not.toContain(
      "business.industryPresetId",
    );
  });

  it("CLEAR_INTERVIEWER_STEP drops the turn for that step only", () => {
    const turnA = turnWithProposal(draft, "business.industryPresetId", "legal");
    const turnB = turnWithProposal(draft, "purpose.secondaryOutcome", "Lead capture");
    const a = ascReducer(draft, { type: "APPLY_INTERVIEWER_TURN", step: 1, turn: turnA });
    const b = ascReducer(a, { type: "APPLY_INTERVIEWER_TURN", step: 2, turn: turnB });
    const c = ascReducer(b, { type: "CLEAR_INTERVIEWER_STEP", step: 1 });
    expect(c.meta.interviewer?.lastTurnByStep[1]).toBeUndefined();
    expect(c.meta.interviewer?.lastTurnByStep[2]).toBeDefined();
  });
});
