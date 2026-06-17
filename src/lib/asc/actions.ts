/**
 * ASC reducer action union.
 *
 * Slice 5 adds Logic Architect (proposal-only) actions for Steps 5–7 and
 * the manual outcome/notification edit actions Step 5/6 need.
 */
import type {
  AscCallerReason,
  AscDestinationInput,
  AscDraft,
  AscGapItem,
  AscGenerated,
  AscGenerationError,
  AscInterviewerTurn,
  AscLaunchInput,
  AscLogicArchitectProposal,
  AscNotificationEdit,
  AscOutcomeEdit,
  AscStepStatus,
  AscWizardInput,
} from "./types";
import type {
  AscLaAdvisory,
  AscLaProposalValue,
  AscLaStep,
} from "./logicArchitectSchema";
import type { AscStep8Advisory } from "./step8CompileSchema";

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
  | { type: "DISMISS_GAP_ITEM"; step: AscGapFinderStep; itemId: string }
  // --- Slice 5: outcome/notification manual editors ---
  | { type: "ADD_OUTCOME_EDIT"; outcome: AscOutcomeEdit }
  | { type: "UPDATE_OUTCOME_EDIT"; id: string; patch: Partial<AscOutcomeEdit> }
  | { type: "REMOVE_OUTCOME_EDIT"; id: string }
  | { type: "ADD_NOTIFICATION_EDIT"; notification: AscNotificationEdit }
  | {
      type: "UPDATE_NOTIFICATION_EDIT";
      id: string;
      patch: Partial<AscNotificationEdit>;
    }
  | { type: "REMOVE_NOTIFICATION_EDIT"; id: string }
  // --- Slice 5: Logic Architect (proposals only) ---
  | {
      type: "APPLY_LOGIC_ARCHITECT_RESULT";
      step: AscLaStep;
      proposals: AscLogicArchitectProposal[];
      advisories: AscLaAdvisory[];
      now: string;
    }
  | {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL";
      step: AscLaStep;
      proposalId: string;
      /** For Step 7 launch.slugCandidates: the slug the user picked. */
      chosenSlug?: string;
      /** For Step 7 launch.slugCandidates: client-side uniqueness result. */
      slugIsUnique?: boolean;
    }
  | {
      type: "REJECT_LOGIC_ARCHITECT_PROPOSAL";
      step: AscLaStep;
      proposalId: string;
    }
  | {
      type: "EDIT_LOGIC_ARCHITECT_PROPOSAL";
      step: AscLaStep;
      proposalId: string;
      nextValue: AscLaProposalValue;
    }
  | { type: "CLEAR_LOGIC_ARCHITECT_STEP"; step: AscLaStep }
  // --- Slice 6: Step 8 generation pipeline (ASC-local) ---
  | { type: "BEGIN_STEP8_GENERATION"; now: string }
  | {
      type: "APPLY_STEP8_GENERATION";
      generated: AscGenerated;
      advisories: AscStep8Advisory[];
      now: string;
    }
  | {
      type: "FAIL_STEP8_GENERATION";
      now: string;
      error: AscGenerationError;
    }
  | { type: "DISCARD_STEP8_GENERATION"; now: string }
  // --- Slice 8: one-way fork into canonical builder ---
  | {
      type: "MARK_FORKED";
      at: string;
      by: string;
      target?: "canonical_builder";
    };
