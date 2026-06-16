/**
 * ASC reducer.
 *
 * Framework-free, no React imports, no I/O. The only mutator of AscDraft.
 *
 * Slice 3 adds Interviewer-turn handling:
 *   - APPLY_INTERVIEWER_TURN stores the latest assistant turn under
 *     `meta.interviewer.lastTurnByStep[step]`. If the model tries to
 *     re-ask a target field that is already in `confirmedFields`, the
 *     reducer drops the `nextQuestion` (proposals still pass through).
 *   - CONFIRM_PROPOSED_FIELD writes the proposal's value into the matching
 *     `input` slot ONLY IF the field's current value still matches the
 *     snapshot captured at proposal-issue time. Manual edits always win.
 *   - REJECT_PROPOSED_FIELD flips a proposal to "rejected" without writing.
 *   - Manual UPDATE_BUSINESS / UPDATE_PURPOSE marks any pending proposal
 *     for a touched target field as "stale" so the UI hides Confirm.
 *
 * Canonical-write helpers (ascGeneratedToRunnerPayload, forkToCanonical)
 * remain throw-on-invoke stubs.
 */
import type { AscAction } from "./actions";
import {
  ASC_TOTAL_STEPS,
  type AscDraft,
  type AscInterviewerMeta,
  type AscInterviewerProposal,
  type AscInterviewerTurn,
} from "./types";
import {
  readTargetFieldValue,
  serializeFieldValue,
  targetFieldKey,
  targetFieldSlot,
  type AscInterviewerTargetField,
} from "./interviewerSchema";

function bumpUpdated(draft: AscDraft, now?: string): AscDraft {
  return {
    ...draft,
    meta: {
      ...draft.meta,
      updatedAt: now ?? new Date().toISOString(),
    },
  };
}

function emptyInterviewerMeta(): AscInterviewerMeta {
  return { lastTurnByStep: {}, confirmedFields: [] };
}

function getInterviewer(draft: AscDraft): AscInterviewerMeta {
  return draft.meta.interviewer ?? emptyInterviewerMeta();
}

function withInterviewer(
  draft: AscDraft,
  next: AscInterviewerMeta,
): AscDraft {
  return {
    ...draft,
    meta: { ...draft.meta, interviewer: next },
  };
}

function markStaleForFields(
  meta: AscInterviewerMeta,
  fields: AscInterviewerTargetField[],
): AscInterviewerMeta {
  if (fields.length === 0) return meta;
  const fset = new Set<string>(fields);
  const nextByStep: AscInterviewerMeta["lastTurnByStep"] = {};
  let changed = false;
  for (const [stepKey, turn] of Object.entries(meta.lastTurnByStep)) {
    if (!turn) continue;
    const step = Number(stepKey) as 1 | 2;
    const nextProposals = turn.proposals.map((p) =>
      p.status === "pending" && fset.has(p.targetField)
        ? { ...p, status: "stale" as const }
        : p,
    );
    if (nextProposals.some((p, i) => p !== turn.proposals[i])) changed = true;
    nextByStep[step] = { ...turn, proposals: nextProposals };
  }
  if (!changed) return meta;
  return { ...meta, lastTurnByStep: nextByStep };
}

function findProposal(
  meta: AscInterviewerMeta,
  step: 1 | 2,
  proposalId: string,
): { turn: AscInterviewerTurn; proposal: AscInterviewerProposal } | null {
  const turn = meta.lastTurnByStep[step];
  if (!turn) return null;
  const proposal = turn.proposals.find((p) => p.id === proposalId);
  if (!proposal) return null;
  return { turn, proposal };
}

function applyProposalValue(
  draft: AscDraft,
  proposal: AscInterviewerProposal,
): AscDraft {
  const slot = targetFieldSlot(proposal.targetField);
  const key = targetFieldKey(proposal.targetField);
  if (slot === "business") {
    return {
      ...draft,
      input: {
        ...draft.input,
        business: {
          ...draft.input.business,
          [key]:
            key === "hours"
              ? { ...draft.input.business.hours, coverage: proposal.value as never }
              : (proposal.value as never),
        },
      },
    };
  }
  return {
    ...draft,
    input: {
      ...draft.input,
      purpose: {
        ...draft.input.purpose,
        [key]: proposal.value as never,
      },
    },
  };
}

export function ascReducer(state: AscDraft, action: AscAction): AscDraft {
  switch (action.type) {
    case "INIT_DRAFT":
    case "RESET_DRAFT":
      return action.draft;

    case "SET_STEP": {
      const clamped = Math.min(
        Math.max(1, Math.floor(action.step)),
        ASC_TOTAL_STEPS,
      );
      if (clamped === state.step) return state;
      return bumpUpdated({ ...state, step: clamped });
    }

    case "UPDATE_BUSINESS": {
      const touched: AscInterviewerTargetField[] = Object.keys(action.patch)
        .map((k) => `business.${k}` as AscInterviewerTargetField);
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          business: { ...state.input.business, ...action.patch },
        },
      });
      if (!next.meta.interviewer) return next;
      return withInterviewer(
        next,
        markStaleForFields(next.meta.interviewer, touched),
      );
    }

    case "UPDATE_PURPOSE": {
      const touched: AscInterviewerTargetField[] = Object.keys(action.patch)
        .map((k) => `purpose.${k}` as AscInterviewerTargetField);
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          purpose: { ...state.input.purpose, ...action.patch },
        },
      });
      if (!next.meta.interviewer) return next;
      return withInterviewer(
        next,
        markStaleForFields(next.meta.interviewer, touched),
      );
    }

    case "ADD_CALLER_REASON":
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: [...state.input.callerReasons, action.reason],
        },
      });

    case "UPDATE_CALLER_REASON":
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: state.input.callerReasons.map((r) =>
            r.id === action.id ? { ...r, ...action.patch } : r,
          ),
        },
      });

    case "REMOVE_CALLER_REASON":
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: state.input.callerReasons.filter(
            (r) => r.id !== action.id,
          ),
        },
      });

    case "SET_DESTINATION":
      return bumpUpdated({
        ...state,
        input: { ...state.input, destination: action.destination },
      });

    case "SET_LAUNCH":
      return bumpUpdated({
        ...state,
        input: { ...state.input, launch: action.launch },
      });

    case "MARK_STEP_STATUS":
      return bumpUpdated({
        ...state,
        stepStatus: { ...state.stepStatus, [action.step]: action.status },
      });

    case "TOUCH":
      return bumpUpdated(state, action.now);

    // ── Slice 3: Interviewer ──────────────────────────────────────────────
    case "APPLY_INTERVIEWER_TURN": {
      const meta = getInterviewer(state);
      const confirmed = new Set(meta.confirmedFields);
      let turn = action.turn;
      // Suppress re-asks: drop nextQuestion if its targetField is already
      // confirmed. Proposals still flow through so the model can surface
      // inferences for other fields in the same turn.
      if (
        turn.questionTargetField &&
        confirmed.has(turn.questionTargetField)
      ) {
        turn = {
          ...turn,
          questionId: null,
          questionPrompt: null,
          questionTargetField: null,
          questionInputKind: null,
          questionOptions: undefined,
        };
      }
      const nextMeta: AscInterviewerMeta = {
        ...meta,
        lastTurnByStep: { ...meta.lastTurnByStep, [action.step]: turn },
      };
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    case "CONFIRM_PROPOSED_FIELD": {
      const meta = getInterviewer(state);
      const found = findProposal(meta, action.step, action.proposalId);
      if (!found) return state;
      const { proposal } = found;
      if (proposal.status !== "pending") return state;
      // Manual-wins-over-stale: drop if the field's current value has
      // diverged from the snapshot captured at proposal time.
      const currentSerialized = serializeFieldValue(
        readTargetFieldValue(state.input, proposal.targetField),
      );
      if (currentSerialized !== proposal.fieldSnapshot) {
        // Mark stale so the UI hides Confirm; never write.
        const stale = markStaleForFields(meta, [proposal.targetField]);
        return bumpUpdated(withInterviewer(state, stale));
      }
      const withValue = applyProposalValue(state, proposal);
      const turn = meta.lastTurnByStep[action.step]!;
      const nextTurn: AscInterviewerTurn = {
        ...turn,
        proposals: turn.proposals.map((p) =>
          p.id === proposal.id ? { ...p, status: "confirmed" as const } : p,
        ),
      };
      const nextConfirmed = meta.confirmedFields.includes(proposal.targetField)
        ? meta.confirmedFields
        : [...meta.confirmedFields, proposal.targetField];
      const nextMeta: AscInterviewerMeta = {
        ...meta,
        lastTurnByStep: { ...meta.lastTurnByStep, [action.step]: nextTurn },
        confirmedFields: nextConfirmed,
      };
      return bumpUpdated(withInterviewer(withValue, nextMeta));
    }

    case "REJECT_PROPOSED_FIELD": {
      const meta = getInterviewer(state);
      const found = findProposal(meta, action.step, action.proposalId);
      if (!found) return state;
      const turn = found.turn;
      const nextTurn: AscInterviewerTurn = {
        ...turn,
        proposals: turn.proposals.map((p) =>
          p.id === action.proposalId
            ? { ...p, status: "rejected" as const }
            : p,
        ),
      };
      const nextMeta: AscInterviewerMeta = {
        ...meta,
        lastTurnByStep: { ...meta.lastTurnByStep, [action.step]: nextTurn },
      };
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    case "CLEAR_INTERVIEWER_STEP": {
      const meta = getInterviewer(state);
      if (!meta.lastTurnByStep[action.step]) return state;
      const { [action.step]: _dropped, ...rest } = meta.lastTurnByStep;
      void _dropped;
      const nextMeta: AscInterviewerMeta = { ...meta, lastTurnByStep: rest };
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

// ── Slice 6/7 stubs ────────────────────────────────────────────────────────
// Loud failure if anything tries to write canonical entities or build a
// runner payload before those slices land.

export function ascGeneratedToRunnerPayload(): never {
  throw new Error(
    "[asc] ascGeneratedToRunnerPayload is not implemented in Slice 1.",
  );
}

export function forkToCanonical(): never {
  throw new Error("[asc] forkToCanonical is not implemented in Slice 1.");
}
