/**
 * Business Brain bridge — `bridge/search` (Phase 8).
 *
 * Internal-search view models and entry point. Stable for in-app callers
 * (Brain search page and other internal features). No public HTTP surface.
 *
 * @stable
 */
export type {
  BbSearchEvidence,
  BbSearchCard,
  BbSearchInput,
  BbSearchResponse,
} from "../selectors";
export { searchApprovedKnowledge, triggerBbBackfill } from "../selectors";
