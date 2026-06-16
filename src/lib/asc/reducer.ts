/**
 * ASC Slice 1 — pure reducer.
 *
 * Framework-free, no React imports, no I/O. The only mutator of AscDraft.
 *
 * Slice 1 explicitly does NOT export canonical-write helpers
 * (ascGeneratedToRunnerPayload, forkToCanonical). Those are stubbed below as
 * throw-on-invoke exports so misuse fails loudly before Slice 6/7 lands.
 */
import type { AscAction } from "./actions";
import { ASC_TOTAL_STEPS, type AscDraft } from "./types";

function bumpUpdated(draft: AscDraft, now?: string): AscDraft {
  return {
    ...draft,
    meta: {
      ...draft.meta,
      updatedAt: now ?? new Date().toISOString(),
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

    case "UPDATE_BUSINESS":
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          business: { ...state.input.business, ...action.patch },
        },
      });

    case "UPDATE_PURPOSE":
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          purpose: { ...state.input.purpose, ...action.patch },
        },
      });

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
