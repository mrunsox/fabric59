/**
 * ASC reducer action union.
 *
 * Slice 3 adds Interviewer turn handling. Canonical-write actions (fork,
 * generate, etc.) still land in later slices.
 */
import type {
  AscCallerReason,
  AscDestinationInput,
  AscDraft,
  AscInterviewerTurn,
  AscLaunchInput,
  AscStepStatus,
  AscWizardInput,
} from "./types";

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
  // --- Slice 3: Interviewer ---
  | { type: "APPLY_INTERVIEWER_TURN"; step: 1 | 2; turn: AscInterviewerTurn }
  | { type: "CONFIRM_PROPOSED_FIELD"; step: 1 | 2; proposalId: string }
  | { type: "REJECT_PROPOSED_FIELD"; step: 1 | 2; proposalId: string }
  | { type: "CLEAR_INTERVIEWER_STEP"; step: 1 | 2 };
