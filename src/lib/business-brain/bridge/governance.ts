/**
 * Business Brain bridge — `bridge/governance` (Phase 8).
 *
 * Stable read surface for Phase 5–7 governance: staleness, conflicts,
 * vertical coverage/gaps, demand-gap topics. Brain pages and other internal
 * governance UI should import from here. ASC and runner code must NOT.
 *
 * @stable
 */
export type {
  StaleFactView,
  ConflictView,
  VerticalGapFilter,
  BbGapTopicView,
  GapTopicFilter,
} from "../selectors";
export {
  listStaleFacts,
  listConflicts,
  markFactReviewed,
  markFactNeedsUpdate,
  resolveConflict,
  triggerGovernanceSweep,
  getWorkspaceVerticalProfile,
  getVerticalCoverageSummary,
  listVerticalGaps,
  suppressVerticalGap,
  triggerVerticalEvaluation,
  listGapTopics,
  dismissGapTopic,
  suppressGapTopic,
  linkGapTopicToFact,
  buildFactDraftLinkFromGap,
  triggerGapClusterRun,
} from "../selectors";
