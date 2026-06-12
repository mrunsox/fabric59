import { newFlowId } from "./schema";
import type {
  CampaignFlowContent,
  CampaignFlowTemplate,
  FlowStep,
  FlowStepType,
} from "@/types/campaign-flow";

export const DEFAULT_STEP_TITLES: Record<FlowStepType, string> = {
  question_branch: "Ask a question",
  information_display: "Show information",
  field_capture: "Capture a field",
  outcome_disposition: "Record an outcome",
  escalation_trigger: "Escalate",
  notification_trigger: "Notify",
  end_flow: "End call",
};

function step(type: FlowStepType, partial: Partial<FlowStep> & { config?: FlowStep["config"] }, order: number): FlowStep {
  return {
    id: newFlowId("stp"),
    type,
    title: partial.title ?? DEFAULT_STEP_TITLES[type],
    description: partial.description,
    order,
    required: partial.required ?? false,
    enabled: partial.enabled ?? true,
    nextStepId: partial.nextStepId ?? null,
    rules: partial.rules ?? [],
    config: partial.config ?? {},
  };
}

/**
 * Generic intake starter — neutral call capture flow for any service business.
 * Free of vertical-specific vocabulary.
 */
export function buildGenericIntakeTemplate(): CampaignFlowContent {
  const steps: FlowStep[] = [
    step("information_display", {
      title: "Greeting",
      description: "Read the standard greeting from the workspace guide.",
      required: true,
      config: { body: "Thank you for calling {{client_name}}. How can I help you today?" },
    }, 1),
    step("question_branch", {
      title: "Reason for call",
      required: true,
      config: {
        prompt: "What is the caller's reason for calling?",
        options: [
          { id: newFlowId("opt"), label: "New inquiry", goto: null },
          { id: newFlowId("opt"), label: "Existing customer", goto: null },
          { id: newFlowId("opt"), label: "Other", goto: null },
        ],
      },
    }, 2),
    step("field_capture", {
      title: "Caller name",
      required: true,
      config: { fieldKey: "caller_name", fieldType: "short_text", destinationKey: "contact.full_name" },
    }, 3),
    step("field_capture", {
      title: "Caller phone",
      required: true,
      config: { fieldKey: "caller_phone", fieldType: "phone", destinationKey: "contact.phone" },
    }, 4),
    step("field_capture", {
      title: "Caller email",
      config: { fieldKey: "caller_email", fieldType: "email", destinationKey: "contact.email" },
    }, 5),
    step("field_capture", {
      title: "Summary",
      config: { fieldKey: "summary", fieldType: "ai_summary", destinationKey: "notes.summary" },
    }, 6),
    step("outcome_disposition", {
      title: "Disposition",
      required: true,
      config: {
        allowedOutcomes: [
          { code: "qualified", label: "Qualified lead", urgency: "normal" },
          { code: "callback", label: "Callback requested", urgency: "normal" },
          { code: "not_interested", label: "Not interested", urgency: "low" },
        ],
        destinationKey: "outcome.code",
      },
    }, 7),
    step("end_flow", {
      title: "Wrap up",
      config: { label: "Thank the caller and end the call.", nextStateSummary: "Submit captured fields to downstream systems." },
    }, 8),
  ];
  return { schemaVersion: 1, steps, mappings: [
    { id: newFlowId("map"), sourceKey: "caller_name", destinationKey: "contact.full_name" },
    { id: newFlowId("map"), sourceKey: "caller_phone", destinationKey: "contact.phone" },
    { id: newFlowId("map"), sourceKey: "caller_email", destinationKey: "contact.email" },
    { id: newFlowId("map"), sourceKey: "summary", destinationKey: "notes.summary" },
  ] };
}

/**
 * Legal intake starter. Only place legal vocabulary appears as a default
 * in the campaign flow domain — practice areas, conflict checks, attorney
 * escalation. Templates can be edited freely after applying.
 */
export function buildLegalIntakeTemplate(): CampaignFlowContent {
  const steps: FlowStep[] = [
    step("information_display", {
      title: "Greeting",
      required: true,
      config: { body: "Thank you for calling {{firm_name}}. How may I direct your call?" },
    }, 1),
    step("question_branch", {
      title: "Practice area",
      required: true,
      config: {
        prompt: "What type of legal matter is this regarding?",
        options: [
          { id: newFlowId("opt"), label: "Personal injury", goto: null },
          { id: newFlowId("opt"), label: "Family law", goto: null },
          { id: newFlowId("opt"), label: "Criminal defense", goto: null },
          { id: newFlowId("opt"), label: "Other / not sure", goto: null },
        ],
      },
    }, 2),
    step("field_capture", {
      title: "Caller name",
      required: true,
      config: { fieldKey: "caller_name", fieldType: "short_text", destinationKey: "contact.full_name", destinationProvider: "clio" },
    }, 3),
    step("field_capture", {
      title: "Opposing party",
      description: "Required for conflict-check before booking a consultation.",
      config: { fieldKey: "opposing_party", fieldType: "short_text", destinationKey: "matter.opposing_party", destinationProvider: "clio", helper: "Required for conflict-check before booking a consultation." },
    }, 4),
    step("information_display", {
      title: "Conflict check reminder",
      config: { body: "Do not commit to a consultation until the firm confirms no conflict." },
    }, 5),
    step("field_capture", {
      title: "Matter type",
      config: {
        fieldKey: "matter_type",
        fieldType: "single_select",
        options: [
          { id: newFlowId("opt"), label: "Personal injury" },
          { id: newFlowId("opt"), label: "Family law" },
          { id: newFlowId("opt"), label: "Criminal defense" },
          { id: newFlowId("opt"), label: "Other" },
        ],
        destinationKey: "matter.practice_area",
        destinationProvider: "clio",
      },
    }, 6),
    step("field_capture", {
      title: "Urgency",
      config: { fieldKey: "urgency", fieldType: "urgency_selector", destinationKey: "matter.urgency" },
    }, 7),
    step("escalation_trigger", {
      title: "Attorney escalation",
      description: "Route to on-call attorney if urgency is high.",
      config: { targetRole: "on_call_attorney", reason: "High-urgency intake" },
    }, 8),
    step("outcome_disposition", {
      title: "Disposition",
      required: true,
      config: {
        allowedOutcomes: [
          { code: "consult_booked", label: "Consultation booked", urgency: "normal" },
          { code: "conflict", label: "Conflict — no consult", urgency: "high" },
          { code: "not_a_fit", label: "Not a fit", urgency: "low" },
          { code: "callback", label: "Callback requested", urgency: "normal" },
        ],
        destinationKey: "outcome.code",
      },
    }, 9),
    step("end_flow", {
      title: "Wrap up",
      config: { label: "Confirm next steps and end the call.", nextStateSummary: "Push matter to the firm's practice management system." },
    }, 10),
  ];
  return {
    schemaVersion: 1,
    steps,
    mappings: [
      { id: newFlowId("map"), sourceKey: "caller_name", destinationKey: "contact.full_name", destinationProvider: "clio" },
      { id: newFlowId("map"), sourceKey: "opposing_party", destinationKey: "matter.opposing_party", destinationProvider: "clio" },
      { id: newFlowId("map"), sourceKey: "matter_type", destinationKey: "matter.practice_area", destinationProvider: "clio" },
      { id: newFlowId("map"), sourceKey: "urgency", destinationKey: "matter.urgency" },
    ],
  };
}

export const CAMPAIGN_FLOW_TEMPLATES: CampaignFlowTemplate[] = [
  {
    id: "generic-intake",
    name: "Generic intake starter",
    description: "Neutral call capture flow for any service business.",
    vertical: "generic",
    build: buildGenericIntakeTemplate,
  },
  {
    id: "legal-intake",
    name: "Legal intake starter",
    description: "Practice area, conflict check, attorney escalation.",
    vertical: "legal",
    build: buildLegalIntakeTemplate,
  },
];

export function getCampaignFlowTemplate(id: string): CampaignFlowTemplate | undefined {
  return CAMPAIGN_FLOW_TEMPLATES.find((t) => t.id === id);
}
