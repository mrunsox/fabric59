/**
 * Transfer directory — canonical typed model.
 *
 * Persisted under `campaigns.metadata.transferDirectory`. Industry-neutral
 * fields only — vertical-specific vocabulary (e.g. "claims", "intake") lives
 * in user-defined tags, never in the type names.
 */

export const TRANSFER_DIRECTORY_VERSION = 1 as const;

export type TransferType =
  | "warm"
  | "cold"
  | "conference"
  | "instructions_only";

export type Urgency = "low" | "normal" | "high" | "critical";
export type HoursBehavior = "always" | "business_hours" | "after_hours";

export interface TransferEntry {
  id: string;
  displayName: string;
  team?: string;
  role?: string;
  phoneNumber?: string;
  extension?: string;
  transferType: TransferType;
  enabled: boolean;
  fallback: boolean;
  /** 0 = not an escalation, 1 = tier 1, 2 = tier 2, 3 = critical. */
  escalationLevel: 0 | 1 | 2 | 3;
  issueTags: string[];
  specialtyTags: string[];
  urgencyTags: Urgency[];
  hours: HoursBehavior;
  instructions?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

export type ContextFieldKey =
  | "issueType"
  | "category"
  | "specialty"
  | "urgency"
  | "stepId"
  | "branch"
  | "disposition"
  | "timeMode"
  | "transferGroup"
  | "capturedField"; // requires `.key`

export type ConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "contains"
  | "gte"
  | "lte"
  | "exists"
  | "missing";

export interface Condition {
  field: ContextFieldKey;
  /** Required when `field === "capturedField"`. */
  key?: string;
  op: ConditionOperator;
  value?: string | string[] | number | boolean;
}

export interface ConditionGroup {
  combinator: "all" | "any";
  conditions: (Condition | ConditionGroup)[];
}

export type RuleAction =
  | { kind: "include"; targetIds: string[] | "*"; tagsAny?: string[] }
  | { kind: "exclude"; targetIds: string[] | "*"; tagsAny?: string[] }
  | { kind: "prioritize"; targetIds: string[]; boost?: number }
  | { kind: "escalation_only"; targetIds: string[] }
  | { kind: "fallback_only"; targetIds: string[] }
  | { kind: "instructions_only"; message: string }
  | { kind: "annotate"; targetIds: string[] | "*"; rationale: string };

export interface TransferRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Higher wins on conflict among same action class. */
  priority: number;
  when: ConditionGroup;
  then: RuleAction;
}

export interface TransferDirectoryConfig {
  version: typeof TRANSFER_DIRECTORY_VERSION;
  entries: TransferEntry[];
  rules: TransferRule[];
  updatedAt: string | null;
}

export const DEFAULT_TRANSFER_DIRECTORY: TransferDirectoryConfig = {
  version: TRANSFER_DIRECTORY_VERSION,
  entries: [],
  rules: [],
  updatedAt: null,
};

/** Runtime context the engine consumes. All fields optional. */
export interface TransferEvaluationContext {
  issueType?: string | null;
  category?: string | null;
  specialty?: string | null;
  urgency?: Urgency | null;
  stepId?: string | null;
  branch?: string | null;
  disposition?: string | null;
  timeMode?: HoursBehavior | null;
  transferGroup?: string | null;
  capturedFields?: Record<string, unknown>;
}

export type TargetBucket =
  | "recommended"
  | "allowed"
  | "escalation"
  | "fallback"
  | "unavailable";

export interface EvaluatedTarget {
  entry: TransferEntry;
  bucket: TargetBucket;
  boost: number;
  reasons: string[];
  matchedRuleIds: string[];
}

export interface EvaluationResult {
  recommended: EvaluatedTarget[];
  allowed: EvaluatedTarget[];
  escalation: EvaluatedTarget[];
  fallback: EvaluatedTarget[];
  unavailable: EvaluatedTarget[];
  /** True when exactly one entry survives across recommended+allowed. */
  singleAllowed: boolean;
  /** When set, transfer is suppressed and the agent should follow this message. */
  instructionsOnly: { message: string; ruleId: string } | null;
  /** All matched rule ids in evaluation order — for debug surfaces. */
  matchedRuleIds: string[];
}
