/**
 * Business Brain bridge — `bridge/assist` (Phase 8).
 *
 * The ONLY surface the live call runner / Knowledge Assist panel is allowed
 * to import from `@/lib/business-brain`. Re-exports the assist input/output
 * view models from the existing selectors module.
 *
 * @stable
 */
export type { BbAssistFactsInput } from "../selectors";
export { getAssistFactsForSession } from "../selectors";
