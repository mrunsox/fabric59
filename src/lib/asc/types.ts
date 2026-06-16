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

// Opaque Slice 1 placeholders. Concrete shapes land with the orchestration.
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

export interface AscGenerated {
  guideDraft: AscGuideDraft;
  flowDraft: CampaignFlowContent;
  outcomesDraft: AscOutcomeDraft[];
  notificationsDraft: AscNotificationDraft[];
  destination: AscDestination;
  launch: AscLaunch;
  branchProvenance: Record<string, AscBranchProvenance>;
}

export type AscStepStatus =
  | "idle"
  | "in_progress"
  | "complete"
  | "blocker"
  | "warning";

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
  };
}

export const ASC_TOTAL_STEPS = 10 as const;
