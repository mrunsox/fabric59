/**
 * Phase 6 — Canonical live call runner.
 *
 * Runtime types for the agent runner at /app/agent/workspace/:workspaceId/:campaignId.
 * No schema changes — session state lives in-memory and (optionally) localStorage so
 * an agent survives refresh/disconnect within the limits of the existing primitives.
 *
 * Industry-neutral: no legal vocabulary in this file.
 */

export const CALL_RUNNER_SESSION_SCHEMA_VERSION = 1 as const;

export interface CallSessionMeta {
  workspaceId: string;
  workspaceName?: string;
  campaignId: string;
  campaignName?: string;
  /** Five9 call id / interaction id when present. */
  callId?: string | null;
  /** Caller automatic number identification (ANI) when known. */
  ani?: string | null;
  /** ISO timestamp when the runner first mounted for this session. */
  startedAt: string;
}

export interface CallSessionState {
  schemaVersion: typeof CALL_RUNNER_SESSION_SCHEMA_VERSION;
  meta: CallSessionMeta;
  /** Current step id (null = pre-start or post-finish). */
  currentStepId: string | null;
  /** Step ids the agent has already advanced past, in order. */
  completedStepIds: string[];
  /** Captured field values + system keys like __outcome__. */
  values: Record<string, unknown>;
  /** Free-form agent notes (in addition to captured fields). */
  notes: string;
  /** Last touch — used to expire stale sessions on resume. */
  updatedAt: string;
  /** True once the agent has clicked Submit. */
  finalized: boolean;
}

export interface CopilotSuggestion {
  id: string;
  /** Which copilot lane this suggestion answers. */
  kind:
    | "suggested_answer"
    | "next_best_question"
    | "draft_summary"
    | "likely_outcome"
    | "notification_target"
    | "missing_knowledge";
  title: string;
  body: string;
  /** Short attribution / source explainer ("From workspace guide · Hours"). */
  source?: string;
  /** Optional rationale shown under the suggestion. */
  rationale?: string;
  /**
   * Phase 5 — "Why this answer" attribution. Populated when the suggestion
   * was grounded in a Knowledge Bin item. Missing-knowledge suggestions
   * intentionally leave these undefined.
   */
  sourceType?:
    | "live_session"
    | "campaign_instruction"
    | "required_field"
    | "workspace_guide"
    | "business_brain"
    | "supplementary"
    | "routing";
  sourceId?: string | null;
  precedence?: number;
  /** When a higher-precedence source displaced another, the human reason. */
  conflictReason?: string;
}

export interface CopilotResult {
  suggestions: CopilotSuggestion[];
  /** Set true when copilot intentionally returned nothing (vs. still loading). */
  empty: boolean;
}

export type CopilotFeedbackVerdict = "helpful" | "not_helpful";

/**
 * Phase 6 boundary payload — what the runner hands to Phase 7's submission pipeline.
 * Shape is intentionally generic; Phase 7 will translate to InteractionRecord +
 * adapter writeback + notifications + sync logs + retries.
 */
export interface InteractionDraftPayload {
  schemaVersion: 1;
  meta: CallSessionMeta;
  values: Record<string, unknown>;
  notes: string;
  outcomeCode: string | null;
  copilot: {
    draftSummary?: string;
    suggestedNotificationTargets?: string[];
  };
  completedStepIds: string[];
  finalizedAt: string;
}
