/**
 * Business Brain bridge — `bridge/asc` (Phase 8).
 *
 * The ONLY surface ASC code is allowed to import from `@/lib/business-brain`.
 * Re-exports the suggestion view-models and per-step builders ASC already
 * consumes. Stable as of Phase 8.
 *
 * @stable
 */
export type {
  BbAscApplyIntent,
  BbAscStep,
  BbAscSuggestion,
} from "../selectors";
export {
  buildCallerReasonSuggestions,
  buildIntakeRequirementSuggestions,
  buildEscalationSuggestions,
  buildDestinationSuggestions,
  BB_STEP_ENTITY_TYPES,
  BB_SUGGESTION_CAP_PER_STEP,
} from "../selectors";
