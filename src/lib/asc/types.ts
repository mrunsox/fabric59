/**
 * ASC (AI-Assisted Script Creation) — Phase 2 data contract, front-end types.
 *
 * Slice 1 mirrors the Phase 2 contract verbatim. No new persisted state values
 * have been added in this slice; if Slice 2+ needs new state values, that
 * change must update the Phase 2 contract first.
 *
 * Several "generated"-side sub-types (AscGuideDraft, AscOutcomeDraft,
 * AscNotificationDraft, AscForkRecord) are declared as opaque placeholders
 * here because Slice 1 ships no code that constructs them; later slices will
 * flesh them out as the orchestration lands.
 */
import type { CampaignFlowContent } from "@/types/campaign-flow";

export type AscDraftState =
  | "in_progress"
  | "generated"
  | "forked"
  | "published"
  | "discarded";

export type AscConfidence = "high" | "medium" | "low";

export type AscBranchOrigin =
  | "user_stated"
  | "inferred_best_practice"
  | "unresolved_recommendation";

export interface AscHours {
  // Free-form for Slice 1; later slices align with CampaignIntakeData coverage.
  coverage?: "24x7" | "business_hours" | "custom";
  notes?: string;
}

export interface AscBusinessInput {
  description: string;
  industryPresetId: string;
  hours: AscHours;
  callerPersonas: string[];
  promisesToAvoid?: string[];
}

export interface AscPurposeInput {
  primaryOutcome: string;
  secondaryOutcome?: string;
  blockingOutcomes: string[];
  sharedAcrossClients: boolean;
}

export interface AscBranchHint {
  id: string;
  trigger: string;
  outcome: string;
  origin: "user_stated";
}

export interface AscCallerReason {
  id: string;
  label: string;
  requiredCapture: string[];
  opener?: string;
  escalation?: {
    when: string;
    toRole: string;
  };
  variants?: {
    voicemail?: string;
    afterHours?: string;
  };
  branching?: AscBranchHint[];
}

export interface AscDestinationInput {
  kind: "internal_runner" | "external_url" | "deep_link";
  externalUrl?: string;
  deepLinkTemplate?: string;
  openMode?: "same_tab" | "new_tab" | "side_panel";
  notes?: string;
}

export interface AscLaunchInput {
  slug?: string;
  editableUntilPublish?: boolean;
}

export interface AscOutcomeEdit {
  id: string;
  label: string;
  note?: string;
}

export interface AscNotificationEdit {
  id: string;
  trigger: string;
  channel: string;
  note?: string;
}

export interface AscWizardInput {
  business: AscBusinessInput;
  purpose: AscPurposeInput;
  callerReasons: AscCallerReason[];
  outcomesDraftEdits?: AscOutcomeEdit[];
  notificationsDraftEdits?: AscNotificationEdit[];
  launch?: AscLaunchInput;
  destination?: AscDestinationInput;
}

export interface AscUnresolvedItem {
  id: string;
  area:
    | "guide"
    | "flow"
    | "outcomes"
    | "notifications"
    | "destination"
    | "launch";
  message: string;
  severity: "blocker" | "warning";
  dismissed?: { by: string; at: string; reason?: string };
}

export interface AscBranchProvenance {
  origin: AscBranchOrigin;
  sourceAnswerId?: string;
  rationale: string;
  confidence: AscConfidence;
}

// Legacy Slice 1 placeholders. Slice 6 replaced AscGenerated with an
// ASC-local shape; these are kept only to avoid breaking unrelated imports.
export type AscGuideDraft = { __slice1Placeholder: true };
export type AscOutcomeDraft = { __slice1Placeholder: true };
export type AscNotificationDraft = { __slice1Placeholder: true };
export type AscForkRecord = {
  at: string;
  by: string;
  target: "canonical_builder";
};

export interface AscDestination {
  kind: "internal_runner" | "external_url" | "deep_link";
  externalUrl?: string;
  deepLinkTemplate?: string;
  openMode?: "same_tab" | "new_tab" | "side_panel";
  notes?: string;
}

export interface AscLaunch {
  slug: string;
  resolvedUrl: string;
  previousSlugs?: string[];
  editableUntilPublish: boolean;
}

// ── Slice 6 — ASC-local generated draft ───────────────────────────────────
// Deliberately NOT a canonical campaign/guide/flow type. Translation into
// canonical entities is the explicit job of a later fork slice.
export type AscGeneratedNodeKind =
  | "entry"
  | "reason_branch"
  | "handling"
  | "outcome"
  | "exit";

export interface AscGeneratedFlowNode {
  id: string;
  kind: AscGeneratedNodeKind;
  label: string;
  /** For reason_branch / handling nodes. References AscCallerReason.id. */
  reasonId?: string;
  /** For outcome nodes. Normalized outcome label. */
  outcomeRef?: string;
  /** Optional, low-stakes copy slots. Empty when copy is missing or unsafe;
   *  in that case a matching `todos[]` entry explains why. */
  copy?: { opener?: string; body?: string };
  todos?: string[];
}

export interface AscGeneratedFlowEdge {
  id: string;
  from: string;
  to: string;
  /** Human-readable transition label. NOT a runtime predicate. */
  trigger?: string;
}

export interface AscGeneratedOutcomeLink {
  /** Normalized outcome label. */
  outcomeRef: string;
  fromReasonIds: string[];
  notificationRefs: string[];
}

export interface AscGeneratedNotification {
  id: string;
  outcomeRef: string;
  channelRef: string;
  audienceRef?: string;
  urgency: "low" | "normal" | "high";
  note?: string;
}

export interface AscGeneratedDestinationLaunch {
  destination: {
    kind: "internal_runner" | "external_url" | "deep_link";
    externalUrl?: string;
    deepLinkTemplate?: string;
    openMode?: "same_tab" | "new_tab" | "side_panel";
    notes?: string;
  };
  launch: { slug?: string };
}

export type AscGenerationArea =
  | "flow"
  | "copy"
  | "outcomes"
  | "notifications"
  | "destination";

export interface AscGenerationConfidence {
  level: AscConfidence;
  reason?: string;
}

export interface AscGeneratedTodo {
  id: string;
  area: AscGenerationArea;
  message: string;
}

export interface AscGenerated {
  schemaVersion: 1;
  generatedAt: string;
  /** Stable hash of the Step 1–7 inputs that produced this draft. */
  inputFingerprint: string;
  flow: {
    nodes: AscGeneratedFlowNode[];
    edges: AscGeneratedFlowEdge[];
  };
  /** Map AscCallerReason.id → flow node id for the branch that handles it. */
  reasonToBranch: Record<string, string>;
  outcomes: AscGeneratedOutcomeLink[];
  notifications: AscGeneratedNotification[];
  destinationLaunch: AscGeneratedDestinationLaunch;
  todos: AscGeneratedTodo[];
  confidenceByArea: Partial<Record<AscGenerationArea, AscGenerationConfidence>>;
}

// ── Slice 6 — Generation lifecycle metadata ───────────────────────────────
export type AscGenerationStatus =
  | "idle"
  | "compiling"
  | "success"
  | "error";

export type AscGenerationErrorCode =
  | "schema_invalid"
  | "incomplete"
  | "unsafe"
  | "upstream_error"
  | "rate_limited"
  | "credits_exhausted"
  | "network_error";

export interface AscGenerationError {
  code: AscGenerationErrorCode;
  message: string;
}

export interface AscGenerationMeta {
  status: AscGenerationStatus;
  lastRunAt?: string;
  lastError?: AscGenerationError;
  /** True when the most-recent generation no longer matches Step 1–7 inputs. */
  stale: boolean;
  staleReason?: "input_changed" | "never_generated";
}

export type AscStepStatus =
  | "idle"
  | "in_progress"
  | "complete"
  | "blocker"
  | "warning";

// ── Slice 3: Interviewer turn metadata ─────────────────────────────────────
// Strictly ASC UI/session metadata. Lives under `meta.interviewer` (optional)
// so the Phase 2 input contract is untouched. Canonical builder/runtime
// code MUST NOT read this; only the wizard reducer + AscAssistantPanel may.
import type {
  AscInterviewerInputKind,
  AscInterviewerProposalValue,
  AscInterviewerTargetField,
} from "./interviewerSchema";

export type AscInterviewerProposalStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "stale";

export interface AscInterviewerProposal {
  id: string;
  targetField: AscInterviewerTargetField;
  value: AscInterviewerProposalValue;
  confidence: AscConfidence;
  rationale: string;
  status: AscInterviewerProposalStatus;
  /**
   * Serialized snapshot of the target field's value at proposal-issue time.
   * For per-reason fields this is the serialized slot for the specific
   * `reasonId`. For `callerReasons.add` it is the serialized normalized
   * label set used for duplicate detection. Unused for append-only
   * targets like `callerReason.branching.add`.
   */
  fieldSnapshot: string;
  issuedAt: string;
  /** Required when `targetField` starts with `callerReason.`. */
  reasonId?: string;
}

export interface AscInterviewerTurn {
  questionId: string | null;
  questionPrompt: string | null;
  questionTargetField: AscInterviewerTargetField | null;
  questionInputKind: AscInterviewerInputKind | null;
  questionOptions?: string[];
  questionReasonId?: string;
  proposals: AscInterviewerProposal[];
  askedAt: string;
}


export interface AscInterviewerMeta {
  /** Last completed turn per assisted step. Slices 3–4 cover steps 1–4. */
  lastTurnByStep: Partial<Record<1 | 2 | 3 | 4, AscInterviewerTurn>>;
  /** Target fields the user has confirmed at least once. Used to prevent
   *  the model from re-asking already-answered fields. Per-reason and
   *  `callerReasons.add` targets are intentionally NOT recorded here —
   *  they are repeatable. */
  confirmedFields: AscInterviewerTargetField[];
}

/** Slice 4 — advisory Gap-finder item. ASC-local UI metadata only. */
export type AscGapKind =
  | "missing_handling"
  | "escalation_no_destination"
  | "implied_capture_missing"
  | "after_hours_no_variant"
  | "duplicate_reasons";

export interface AscGapItem {
  id: string;
  step: 3 | 4;
  kind: AscGapKind;
  message: string;
  reasonIds?: string[];
  dismissed?: boolean;
}

export interface AscGapFinderMeta {
  lastRunAt?: string;
  itemsByStep: Partial<Record<3 | 4, AscGapItem[]>>;
}

// ── Slice 5: Logic Architect proposal metadata ─────────────────────────────
import type {
  AscLaProposalValue,
  AscLaTargetField,
  AscLaStep,
  AscLaAdvisory,
} from "./logicArchitectSchema";

export type AscLaProposalStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "stale";

export interface AscLogicArchitectProposal {
  id: string;
  step: AscLaStep;
  targetField: AscLaTargetField;
  value: AscLaProposalValue;
  confidence: AscConfidence;
  rationale: string;
  status: AscLaProposalStatus;
  /** Snapshot of the relevant input slot at proposal-issue time. Used for
   *  the manual-wins-over-stale guard. */
  fieldSnapshot: string;
  /** Set when a Step 3/4 input changed after the proposal was issued. */
  staleReason?: "cross_step_input_changed" | "snapshot_diverged" | "ungrounded";
  issuedAt: string;
}

export interface AscLogicArchitectMeta {
  lastRunAt: Partial<Record<AscLaStep, string>>;
  proposalsByStep: Partial<Record<AscLaStep, AscLogicArchitectProposal[]>>;
  advisoriesByStep: Partial<Record<AscLaStep, AscLaAdvisory[]>>;
}


export interface AscDraft {
  schemaVersion: 1;
  id: string;
  workspaceId: string;
  state: AscDraftState;
  step: number; // 1..10
  stepStatus: Record<number, AscStepStatus>;
  input: AscWizardInput;
  generated?: AscGenerated;
  confidence: Record<string, AscConfidence>;
  unresolved: AscUnresolvedItem[];
  rationales: Record<string, string>;
  forks: AscForkRecord[];
  meta: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    skinId?: string;
    /** Optional. Strictly ASC UI/session metadata — do not consume from
     *  canonical builder or runtime code. */
    interviewer?: AscInterviewerMeta;
    /** Optional. Strictly ASC UI/session metadata — Slice 4 advisory only. */
    gapFinder?: AscGapFinderMeta;
    /** Optional. Slice 5 — Logic Architect proposals/advisories, proposal-only. */
    logicArchitect?: AscLogicArchitectMeta;
  };
}


export const ASC_TOTAL_STEPS = 10 as const;
