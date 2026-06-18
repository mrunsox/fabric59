/**
 * Business Brain — Live Runner Assist context builder (Phase 4).
 *
 * Pure, deterministic derivation of the runtime context the assist ranker
 * consumes. No DOM, no React, no network — unit-testable.
 *
 * Truth boundary: this module only reads the live runner session/flow/guide
 * surfaces. It never mutates them and never imports raw bb_* row types.
 */
import type { CallSessionState, CallSessionMeta } from "@/types/call-runner";
import type { CampaignFlowContent, FlowStep, FlowStepType } from "@/types/campaign-flow";

export type AssistStepKind =
  | "intent"
  | "intake"
  | "hours"
  | "escalation"
  | "destination"
  | "info"
  | "unknown";

export interface AssistSessionContext {
  workspaceId: string;
  clientId: string | null;
  stepId: string | null;
  stepKind: AssistStepKind;
  stepTitle: string | null;
  /** Selected service-ish strings derived from session values; lowercase. */
  serviceHints: string[];
  /** Selected destination/transfer hints from session values; lowercase. */
  destinationHints: string[];
  /** True when the local time is outside 8am–6pm. */
  afterHours: boolean;
  /** True when session has at least one non-empty captured value. */
  hasContext: boolean;
}

const STEP_KIND_MAP: Record<FlowStepType, AssistStepKind> = {
  question_branch: "intent",
  information_display: "info",
  field_capture: "intake",
  outcome_disposition: "destination",
  escalation_trigger: "escalation",
  notification_trigger: "escalation",
  end_flow: "destination",
};

const SERVICE_KEYS = [
  "service",
  "selected_service",
  "__service__",
  "issue_type",
  "__issue_type__",
  "specialty",
  "__specialty__",
];

const DESTINATION_KEYS = [
  "destination",
  "__destination__",
  "transfer_group",
  "__transfer_group__",
  "__branch_label__",
];

function pickStrings(values: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "string" && v.trim()) out.push(v.trim().toLowerCase());
  }
  return Array.from(new Set(out));
}

export interface BuildAssistContextInput {
  meta: CallSessionMeta;
  session: CallSessionState;
  flow: CampaignFlowContent | null;
  /** Resolved tenant/client id, if known. Optional. */
  clientId?: string | null;
  /** Override for testability. */
  now?: Date;
}

export function buildAssistContext(input: BuildAssistContextInput): AssistSessionContext {
  const { meta, session, flow } = input;
  const now = input.now ?? new Date();
  const step: FlowStep | null = flow && session.currentStepId
    ? flow.steps.find((s) => s.id === session.currentStepId) ?? null
    : null;

  const stepKind: AssistStepKind = step ? STEP_KIND_MAP[step.type] ?? "unknown" : "unknown";
  const title = step?.title?.toLowerCase() ?? "";
  // Heuristic upgrades from step title — generic, industry-neutral.
  let kind = stepKind;
  if (/hour|open|closed|after.?hours/.test(title)) kind = "hours";
  else if (/escalat|urgent|emergency/.test(title)) kind = "escalation";
  else if (/transfer|route|destination/.test(title)) kind = "destination";

  const values = session.values ?? {};
  const serviceHints = pickStrings(values, SERVICE_KEYS);
  const destinationHints = pickStrings(values, DESTINATION_KEYS);
  const hour = now.getHours();
  const afterHours = hour < 8 || hour >= 18;
  const hasContext =
    !!session.currentStepId ||
    serviceHints.length > 0 ||
    destinationHints.length > 0 ||
    Object.keys(values).some((k) => {
      const v = values[k];
      return typeof v === "string" ? v.trim().length > 0 : v != null && v !== false;
    });

  return {
    workspaceId: meta.workspaceId,
    clientId: input.clientId ?? null,
    stepId: session.currentStepId,
    stepKind: kind,
    stepTitle: step?.title ?? null,
    serviceHints,
    destinationHints,
    afterHours,
    hasContext,
  };
}
