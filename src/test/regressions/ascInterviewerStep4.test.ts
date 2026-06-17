/**
 * ASC Slice 4 — Interviewer Step 4 per-reason reducer behavior.
 *
 * Covers:
 *   - Per-reason `callerReason.requiredCapture` proposal writes only when
 *     the reason's capture slot still matches the snapshot
 *   - Manual UPDATE_CALLER_REASON between propose and confirm makes the
 *     proposal stale and the confirm becomes a no-op
 *   - REMOVE_CALLER_REASON stales pending per-reason proposals for that id
 *   - `callerReason.branching.add` always appends (append-only, no
 *     staleness check)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import {
  readPerReasonFieldValue,
  serializeFieldValue,
} from "@/lib/asc/interviewerSchema";
import type { AscDraft, AscInterviewerTurn } from "@/lib/asc/types";

function seedWithReason(): AscDraft {
  const draft = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-16T00:00:00.000Z",
  });
  return ascReducer(draft, {
    type: "ADD_CALLER_REASON",
    reason: {
      id: "cr-1",
      label: "New client intake",
      requiredCapture: [],
    },
  });
}

function captureProposalTurn(draft: AscDraft): AscInterviewerTurn {
  const reason = draft.input.callerReasons.find((r) => r.id === "cr-1");
  return {
    questionId: null,
    questionPrompt: null,
    questionTargetField: null,
    questionInputKind: null,
    proposals: [
      {
        id: "prop-1",
        targetField: "callerReason.requiredCapture",
        value: ["Full name", "Phone", "Matter type"],
        confidence: "medium",
        rationale: "Typical intake fields.",
        status: "pending",
        reasonId: "cr-1",
        fieldSnapshot: serializeFieldValue(
          readPerReasonFieldValue(reason, "callerReason.requiredCapture"),
        ),
        issuedAt: "2026-06-16T00:00:00.000Z",
      },
    ],
    askedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("ASC Interviewer Step 4 — per-reason handling (Slice 4)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = seedWithReason();
  });

  it("CONFIRM writes through requiredCapture when snapshot matches", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 4,
      turn: captureProposalTurn(draft),
    });
    const b = ascReducer(a, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 4,
      proposalId: "prop-1",
    });
    const reason = b.input.callerReasons.find((r) => r.id === "cr-1");
    expect(reason?.requiredCapture).toEqual([
      "Full name",
      "Phone",
      "Matter type",
    ]);
    expect(b.meta.interviewer?.lastTurnByStep[4]?.proposals[0].status).toBe(
      "confirmed",
    );
  });

  it("manual edit between propose and confirm makes CONFIRM a no-op", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 4,
      turn: captureProposalTurn(draft),
    });
    const b = ascReducer(a, {
      type: "UPDATE_CALLER_REASON",
      id: "cr-1",
      patch: { requiredCapture: ["Email"] },
    });
    const c = ascReducer(b, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 4,
      proposalId: "prop-1",
    });
    const reason = c.input.callerReasons.find((r) => r.id === "cr-1");
    expect(reason?.requiredCapture).toEqual(["Email"]);
    expect(c.meta.interviewer?.lastTurnByStep[4]?.proposals[0].status).not.toBe(
      "confirmed",
    );
  });

  it("REMOVE_CALLER_REASON stales any pending per-reason proposals for that id", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 4,
      turn: captureProposalTurn(draft),
    });
    const b = ascReducer(a, { type: "REMOVE_CALLER_REASON", id: "cr-1" });
    expect(b.input.callerReasons).toHaveLength(0);
    expect(b.meta.interviewer?.lastTurnByStep[4]?.proposals[0].status).toBe(
      "stale",
    );
  });

  it("branching.add is append-only — works even if other slots change", () => {
    const a = ascReducer(draft, {
      type: "APPLY_INTERVIEWER_TURN",
      step: 4,
      turn: {
        questionId: null,
        questionPrompt: null,
        questionTargetField: null,
        questionInputKind: null,
        proposals: [
          {
            id: "prop-b",
            targetField: "callerReason.branching.add",
            value: { trigger: "Existing client", outcome: "Transfer to attorney" },
            confidence: "medium",
            rationale: "Common branch.",
            status: "pending",
            reasonId: "cr-1",
            fieldSnapshot: "",
            issuedAt: "2026-06-16T00:00:00.000Z",
          },
        ],
        askedAt: "2026-06-16T00:00:00.000Z",
      },
    });
    // Mutate an unrelated slot in between.
    const b = ascReducer(a, {
      type: "UPDATE_CALLER_REASON",
      id: "cr-1",
      patch: { opener: "Hello" },
    });
    const c = ascReducer(b, {
      type: "CONFIRM_PROPOSED_FIELD",
      step: 4,
      proposalId: "prop-b",
    });
    const reason = c.input.callerReasons.find((r) => r.id === "cr-1");
    expect(reason?.branching).toHaveLength(1);
    expect(reason?.branching?.[0].trigger).toBe("Existing client");
    expect(reason?.branching?.[0].outcome).toBe("Transfer to attorney");
  });
});
