/**
 * ASC Slice 1 — typed reducer action union.
 *
 * Intentionally narrow: no AI-related actions yet (APPLY_GENERATED,
 * ACCEPT_GAP, etc.) and no canonical-write actions. Those land in Slice 2+.
 */
import type {
  AscCallerReason,
  AscDestinationInput,
  AscDraft,
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
  | { type: "TOUCH"; now?: string };
