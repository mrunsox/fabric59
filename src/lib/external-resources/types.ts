/**
 * External resource workspace — canonical typed model.
 *
 * Persisted at `campaigns.metadata.externalResources` (sibling of `publish`
 * and `transferDirectory`). Industry-agnostic shape — vertical vocabulary
 * lives only in user-defined `tags` / `*Tags` fields, never in type names.
 *
 * See docs/external-resource-workspace-architecture.md for the full spec.
 */

export const EXTERNAL_RESOURCES_VERSION = 1 as const;

export type ResourceKind =
  | "calendar"
  | "website"
  | "document"
  | "form"
  | "portal"
  | "custom";

export type ResourceOpenMode =
  | "auto"
  | "iframe"
  | "drawer"
  | "replace_center"
  | "new_tab";

export type ResourceWidth = "sm" | "md" | "lg" | "full";
export type ResourceUrgency = "low" | "normal" | "high" | "critical";

export interface ExternalResource {
  id: string;
  label: string;
  kind: ResourceKind;
  url: string;
  description?: string;
  enabled: boolean;
  openMode: ResourceOpenMode;
  sortOrder: number;
  tags: string[];
  issueTags: string[];
  specialtyTags: string[];
  dispositionTags: string[];
  urgencyTags: ResourceUrgency[];
  allowParamInjection: boolean;
  /** Optional query-param template applied when `allowParamInjection`. Values
   *  use `{{token}}` syntax — see resolveParams.ts for the allow-list. */
  paramTemplate?: Record<string, string>;
  notesTemplate?: string;
  requiresConfirmation?: boolean;
  preferredWidth?: ResourceWidth;
  metadata?: Record<string, unknown>;
}

/* --------------------------- rules ---------------------------- */

export type ResourceContextFieldKey =
  | "issueType"
  | "category"
  | "specialty"
  | "urgency"
  | "stepId"
  | "branch"
  | "disposition"
  | "transferGroup"
  | "embedMode"
  | "timeMode"
  | "capturedField"; // requires `.key`

export type ResourceConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "contains"
  | "gte"
  | "lte"
  | "exists"
  | "missing";

export interface ResourceCondition {
  field: ResourceContextFieldKey;
  /** Required when `field === "capturedField"`. */
  key?: string;
  op: ResourceConditionOperator;
  value?: string | string[] | number | boolean;
}

export interface ResourceConditionGroup {
  combinator: "all" | "any";
  conditions: (ResourceCondition | ResourceConditionGroup)[];
}

export type ResourceRuleAction =
  | { kind: "show"; targetIds: string[] | "*"; tagsAny?: string[] }
  | { kind: "hide"; targetIds: string[] | "*"; tagsAny?: string[] }
  | { kind: "prioritize"; targetIds: string[]; boost?: number }
  | { kind: "suggest"; targetIds: string[]; message?: string }
  | { kind: "auto_open_if_safe"; targetId: string }
  | { kind: "annotate"; targetIds: string[] | "*"; rationale: string };

export interface ExternalResourceRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Higher wins on conflict among same action class. */
  priority: number;
  when: ResourceConditionGroup;
  then: ResourceRuleAction;
}

/* ------------------------- config root ------------------------- */

export interface ExternalResourcesConfig {
  version: typeof EXTERNAL_RESOURCES_VERSION;
  resources: ExternalResource[];
  rules: ExternalResourceRule[];
  updatedAt: string | null;
}

export const DEFAULT_EXTERNAL_RESOURCES: ExternalResourcesConfig = {
  version: EXTERNAL_RESOURCES_VERSION,
  resources: [],
  rules: [],
  updatedAt: null,
};

/* ----------------------- evaluation model ---------------------- */

export type EmbedSurfaceMode = "internal" | "embed" | "preview" | "kiosk";

export interface ResourceEvaluationContext {
  issueType?: string | null;
  category?: string | null;
  specialty?: string | null;
  urgency?: ResourceUrgency | null;
  stepId?: string | null;
  branch?: string | null;
  disposition?: string | null;
  transferGroup?: string | null;
  /** Surface the panel is rendered in. Drives launch-mode resolution + auto-open safety. */
  embedMode?: EmbedSurfaceMode | null;
  timeMode?: "always" | "business_hours" | "after_hours" | null;
  capturedFields?: Record<string, unknown>;
  /** Runtime values available for param templating. Same shape as RuntimeValues. */
  runtime?: ResourceRuntimeValues;
  /** Viewport width hint (px). Used by launch-mode resolver for narrow surfaces. */
  viewportWidth?: number | null;
}

/** Allow-listed runtime variable set for param templating. Anything outside
 *  this is silently dropped — see resolveParams.ts. */
export interface ResourceRuntimeValues {
  ani?: string | null;
  callerName?: string | null;
  callerEmail?: string | null;
  issueType?: string | null;
  specialty?: string | null;
  urgency?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  sessionId?: string | null;
  callId?: string | null;
  disposition?: string | null;
  /** `field.<key>` tokens resolve against this map. */
  capturedFields?: Record<string, unknown>;
}

export type ResourceBucket = "recommended" | "available" | "suggested" | "hidden";

export interface EvaluatedResource {
  resource: ExternalResource;
  bucket: ResourceBucket;
  boost: number;
  /** Suggestion message attached by the first matching `suggest` rule. */
  suggestion?: string;
  reasons: string[];
  matchedRuleIds: string[];
  /** Set when an `auto_open_if_safe` rule matched AND the surface allows it. */
  autoOpen?: boolean;
}

export interface ResourceEvaluationResult {
  /** Boosted / suggested / single-survivor entries. */
  recommended: EvaluatedResource[];
  /** Visible non-recommended entries. */
  available: EvaluatedResource[];
  /** Entries flagged by a `suggest` rule but not also boosted. */
  suggested: EvaluatedResource[];
  /** Hidden entries — surfaced only in admin/debug views. */
  hidden: EvaluatedResource[];
  /** Resolved auto-open candidate, if any. */
  autoOpenCandidate: EvaluatedResource | null;
  /** All matched rule ids, in evaluation order. */
  matchedRuleIds: string[];
}

/* ----------------------- launch resolution --------------------- */

export interface LaunchRequest {
  resource: ExternalResource;
  context: ResourceEvaluationContext;
}

export interface LaunchResolution {
  /** Concrete open mode after policy + surface evaluation. */
  mode: Exclude<ResourceOpenMode, "auto">;
  /** Resolved URL with safe param substitution applied. */
  resolvedUrl: string;
  /** Width hint for drawer/iframe surfaces. */
  width: ResourceWidth;
  /** Human-readable reason the mode was chosen. */
  reason: string;
  /** True when openMode was downgraded for safety/embed-mode constraints. */
  downgraded: boolean;
  /** Set when downgraded — the originally preferred mode. */
  originalMode?: ResourceOpenMode;
}

/* ----------------------- event tracking ------------------------ */

export type ResourceEventKind =
  | "surfaced"
  | "opened"
  | "embedded_loaded"
  | "embedded_blocked"
  | "opened_new_tab"
  | "copied"
  | "notes_inserted"
  | "booking_opened"
  | "booking_completed"
  | "booking_link_sent"
  | "booking_unable"
  | "dismissed";

export interface ResourceEvent {
  /** ISO timestamp. */
  at: string;
  kind: ResourceEventKind;
  resourceId: string;
  resourceLabel: string;
  resourceKind: ResourceKind;
  launchMode?: LaunchResolution["mode"];
  /** Small context snapshot — never includes the full session. */
  context?: {
    stepId?: string | null;
    issueType?: string | null;
    urgency?: string | null;
    branch?: string | null;
    disposition?: string | null;
    embedMode?: EmbedSurfaceMode | null;
  };
  /** Optional free-form note (e.g. blocked-embed reason). */
  detail?: string;
}

/** Key under which event trail is appended to the runner session values. */
export const RESOURCE_EVENT_TRAIL_KEY = "__resource_events__" as const;
