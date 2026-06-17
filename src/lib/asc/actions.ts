/**
 * ASC reducer action union.
 *
 * Slice 4 widens the Interviewer step union to {1, 2, 3, 4} and adds the
 * advisory-only Gap-finder actions. Canonical-write actions (fork, generate)
 * still land in later slices.
 */
import type {
  AscCallerReason,
  AscDestinationInput,
  AscDraft,
  AscGapItem,
  AscInterviewerTurn,
  AscLaunchInput,
  AscStepStatus,
  AscWizardInput,
} from "./types";

export type AscInterviewerStep = 1 | 2 | 3 | 4;
export type AscGapFinderStep = 3 | 4;

export type AscAction =
  | { type: "INIT_DRAFT"; draft: AscDraft }
  | { type: "RESET_DRAFT"; draft: AscDraft }
  | { type: "SET_STEP"; step: number }
  | {
      type: "UPDATE_BUSINESS";
      patch: Partial<AscWizardInput["business"]>;
    }
  | {
      type: "UPDATE_PURPOSE";
      patch: Partial<AscWizardInput["purpose"]>;
    }
  | { type: "ADD_CALLER_REASON"; reason: AscCallerReason }
  | { type: "UPDATE_CALLER_REASON"; id: string; patch: Partial<AscCallerReason> }
  | { type: "REMOVE_CALLER_REASON"; id: string }
  | { type: "SET_DESTINATION"; destination: AscDestinationInput }
  | { type: "SET_LAUNCH"; launch: AscLaunchInput }
  | { type: "MARK_STEP_STATUS"; step: number; status: AscStepStatus }
  | { type: "TOUCH"; now?: string }
  // --- Interviewer (Slice 3 + 4) ---
  | {
      type: "APPLY_INTERVIEWER_TURN";
      step: AscInterviewerStep;
      turn: AscInterviewerTurn;
    }
  | {
      type: "CONFIRM_PROPOSED_FIELD";
      step: AscInterviewerStep;
      proposalId: string;
    }
  | {
      type: "REJECT_PROPOSED_FIELD";
      step: AscInterviewerStep;
      proposalId: string;
    }
  | { type: "CLEAR_INTERVIEWER_STEP"; step: AscInterviewerStep }
  // --- Gap-finder (Slice 4, advisory only) ---
  | {
      type: "APPLY_GAP_FINDER_RESULT";
      step: AscGapFinderStep;
      items: AscGapItem[];
      now: string;
    }
  | { type: "DISMISS_GAP_ITEM"; step: AscGapFinderStep; itemId: string };
