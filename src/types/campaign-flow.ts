/**
 * Phase 5 — Canonical Campaign Flow (decision-tree builder).
 *
 * One canonical flow per campaign, stored as a sentinel row in the existing
 * `guides` table (campaign_id set, name '__campaign_flow__',
 * metadata.kind = 'campaign_flow'). Versions live in guide_versions.content
 * as { schemaVersion: 1, steps, mappings } so we reuse the existing
 * draft/publish/version primitives with no schema changes.
 *
 * Industry-neutral: legal vocabulary appears only in templates/presets.
 */

export const CAMPAIGN_FLOW_SENTINEL_NAME = "__campaign_flow__" as const;
export const CAMPAIGN_FLOW_SENTINEL_KIND = "campaign_flow" as const;
export const CAMPAIGN_FLOW_SCHEMA_VERSION = 1 as const;

/** Step type union — generic across industries. */
export type FlowStepType =
  | "question_branch"
  | "information_display"
  | "field_capture"
  | "outcome_disposition"
  | "escalation_trigger"
  | "notification_trigger"
  | "end_flow";

/** Field types supported by field_capture steps. */
export type FlowFieldType =
  | "short_text"
  | "long_text"
  | "phone"
  | "email"
  | "single_select"
  | "multi_select"
  | "checkbox"
  | "datetime"
  | "numeric"
  | "address"
  | "disposition_selector"
  | "urgency_selector"
  | "notification_target"
  | "ai_summary"
  | "hidden";

export interface FlowOption {
  id: string;
  label: string;
  /** Optional explicit jump-to target step id; otherwise default next. */
  goto?: string | null;
}

/** Rule predicate — generic operator set on a captured field or system value. */
export interface FlowCondition {
  id: string;
  /** Source — captured field key, "__outcome__", "__urgency__". */
  source: string;
  op: "eq" | "neq" | "in" | "not_in" | "contains" | "gt" | "lt" | "is_set" | "is_empty";
  /** Compared value. */
  value?: string | number | string[];
}

export interface FlowConditionGroup {
  id: string;
  combinator: "AND" | "OR";
  conditions: FlowCondition[];
}

/** A rule binds one or more condition groups (OR-of-AND) to an action. */
export interface FlowRule {
  id: string;
  groups: FlowConditionGroup[];
  action:
    | { type: "show_step"; stepId: string }
    | { type: "hide_step"; stepId: string }
    | { type: "jump_to"; stepId: string }
    | { type: "require_field"; fieldKey: string }
    | { type: "enable_escalation"; targetId: string }
    | { type: "enable_notification"; targetId: string };
}

/** Configuration payloads per step type — all optional / type-specific. */
export interface QuestionBranchConfig {
  prompt: string;
  options: FlowOption[];
}

export interface InformationDisplayConfig {
  body: string;
  acknowledgement?: string;
}

export interface FieldCaptureConfig {
  fieldKey: string;
  fieldType: FlowFieldType;
  placeholder?: string;
  helper?: string;
  options?: FlowOption[];
  /** Generic destination mapping key (output mapping for Phase 7). */
  destinationKey?: string;
  /** Optional provider hint for adapter-aware mapping (string-only). */
  destinationProvider?: string;
  validation?: { minLength?: number; maxLength?: number; pattern?: string };
}

export interface OutcomeDispositionConfig {
  /** Allowed outcome codes for this step. */
  allowedOutcomes: { code: string; label: string; urgency?: "low" | "normal" | "high" }[];
  destinationKey?: string;
}

export interface EscalationTriggerConfig {
  targetRole: string;
  reason?: string;
  notes?: string;
}

export interface NotificationTriggerConfig {
  channel: "email" | "sms" | "slack" | "webhook";
  target: string;
  payloadSummary?: string;
}

export interface EndFlowConfig {
  label: string;
  nextStateSummary?: string;
}

export type FlowStepConfig =
  | QuestionBranchConfig
  | InformationDisplayConfig
  | FieldCaptureConfig
  | OutcomeDispositionConfig
  | EscalationTriggerConfig
  | NotificationTriggerConfig
  | EndFlowConfig
  | Record<string, never>;

export interface FlowStep {
  id: string;
  type: FlowStepType;
  title: string;
  description?: string;
  /** Position in the outline order (also serves as graph order). */
  order: number;
  required: boolean;
  enabled: boolean;
  /** Branching: default next step id (null = sequential). */
  nextStepId?: string | null;
  /** Step-level visibility/required rules. */
  rules: FlowRule[];
  config: FlowStepConfig;
}

/** Output mapping line — captured key -> destination key, optionally scoped. */
export interface FlowOutputMapping {
  id: string;
  sourceKey: string;
  destinationKey: string;
  destinationProvider?: string;
  notes?: string;
}

export interface CampaignFlowContent {
  schemaVersion: 1;
  steps: FlowStep[];
  mappings: FlowOutputMapping[];
}

export const EMPTY_CAMPAIGN_FLOW: CampaignFlowContent = {
  schemaVersion: 1,
  steps: [],
  mappings: [],
};

export interface CampaignFlowTemplate {
  id: string;
  name: string;
  description: string;
  vertical?: "generic" | "legal" | string;
  build: () => CampaignFlowContent;
}
