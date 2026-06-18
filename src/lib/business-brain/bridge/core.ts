/**
 * Business Brain bridge — `bridge/core` (Phase 8).
 *
 * Stable re-exports of the read-only fact view shape and basic fact selectors.
 * Other bridge modules build on these primitives.
 *
 * Backwards compatibility: `selectors.ts` re-exports continue to work; new
 * code should prefer `@/lib/business-brain/bridge/core`.
 *
 * @stable
 */
export type {
  ApprovedFactView,
  ApprovedFactQuery,
} from "../selectors";
export {
  listApprovedFacts,
  getFactSourceRefs,
  buildBbFactDeepLink,
  buildBbSourceDeepLink,
} from "../selectors";
