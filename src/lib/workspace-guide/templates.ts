import { newId } from "./schema";
import type {
  WorkspaceGuideContentV2,
  WorkspaceGuideSection,
  WorkspaceGuideSectionKind,
  WorkspaceGuideTemplate,
} from "@/types/workspace-guide";

/**
 * Default neutral labels for each section kind. Templates can override the
 * label freely — these are only fallbacks for the builder chrome and for
 * the "add section" picker.
 */
export const DEFAULT_SECTION_LABELS: Record<WorkspaceGuideSectionKind, string> = {
  greeting: "Greeting",
  business_overview: "Business overview",
  service_descriptions: "Service descriptions",
  specialties: "Specialties",
  hours: "Hours and holiday rules",
  callback_policy: "Callback policy",
  escalation_contacts: "Escalation contacts",
  special_handling: "Special handling notes",
  faqs: "FAQs",
  exceptions: "Exceptions / no-go rules",
  internal_notes: "Internal notes",
  custom: "Custom section",
};

type SectionOverrides = {
  label?: string;
  description?: string;
  helper?: string;
  visibility?: WorkspaceGuideSection["visibility"];
  required?: boolean;
  enabled?: boolean;
  fields?: { label: string; value?: string }[];
};

function section(kind: WorkspaceGuideSectionKind, overrides: SectionOverrides = {}): WorkspaceGuideSection {
  return {
    id: newId("sec"),
    kind,
    label: overrides.label ?? DEFAULT_SECTION_LABELS[kind],
    description: overrides.description,
    helper: overrides.helper,
    visibility: overrides.visibility ?? (kind === "internal_notes" ? "internal" : "agent"),
    required: overrides.required ?? ["greeting", "business_overview", "hours"].includes(kind),
    enabled: overrides.enabled ?? true,
    fields: (overrides.fields ?? [{ label: "Body", value: "" }]).map((f) => ({
      id: newId("fld"),
      label: f.label,
      value: f.value ?? "",
    })),
  };
}

/**
 * Generic, industry-agnostic starter. Neutral labels and example placeholders
 * only — never references legal vocabulary.
 */
export function buildGenericTemplate(): WorkspaceGuideContentV2 {
  return {
    schemaVersion: 2,
    sections: [
      section("greeting", {
        helper: "First line the agent says when answering a call.",
        fields: [
          { label: "Standard greeting", value: "Thank you for calling {{client_name}}. How can I help you today?" },
        ],
      }),
      section("business_overview", {
        helper: "Plain-language summary of what this client does.",
        fields: [
          { label: "What the business does", value: "" },
          { label: "Service area", value: "" },
        ],
      }),
      section("service_descriptions", {
        fields: [
          { label: "Primary services", value: "" },
          { label: "Secondary services", value: "" },
        ],
      }),
      section("specialties", {
        label: "Service lines",
        helper: "Specific specialties or service categories worth surfacing to callers.",
        fields: [{ label: "Service lines", value: "" }],
      }),
      section("hours", {
        fields: [
          { label: "Regular hours", value: "Mon–Fri 9am–5pm local" },
          { label: "Holiday rules", value: "" },
        ],
      }),
      section("callback_policy", {
        fields: [{ label: "Policy", value: "Offer a callback when wait time exceeds 60 seconds." }],
      }),
      section("escalation_contacts", {
        visibility: "internal",
        fields: [
          { label: "Primary contact", value: "" },
          { label: "After-hours contact", value: "" },
        ],
      }),
      section("special_handling", {
        fields: [{ label: "Notes", value: "" }],
      }),
      section("faqs", {
        fields: [
          { label: "Q1", value: "" },
          { label: "A1", value: "" },
        ],
      }),
      section("exceptions", {
        fields: [{ label: "Do-not-do list", value: "" }],
      }),
      section("internal_notes", {
        visibility: "internal",
        fields: [{ label: "Notes for the team", value: "" }],
      }),
    ],
  };
}

/**
 * Legal firm starter — only place legal vocabulary appears as a default.
 * Once applied, the result is just a regular workspace guide whose labels
 * can be edited freely.
 */
export function buildLegalFirmStarterTemplate(): WorkspaceGuideContentV2 {
  return {
    schemaVersion: 2,
    sections: [
      section("greeting", {
        helper: "First line the agent says when answering for the firm.",
        fields: [
          {
            label: "Standard greeting",
            value: "Thank you for calling {{firm_name}}, this is {{agent_name}}. How may I direct your call?",
          },
        ],
      }),
      section("business_overview", {
        label: "Firm overview",
        fields: [
          { label: "About the firm", value: "" },
          { label: "Jurisdictions served", value: "" },
        ],
      }),
      section("service_descriptions", {
        label: "Services offered",
        fields: [
          { label: "Primary services", value: "Consultations, intake, case follow-up" },
        ],
      }),
      section("specialties", {
        label: "Practice areas",
        helper: "Practice areas the firm takes calls for, and any it explicitly does not.",
        fields: [
          { label: "Accepts", value: "Personal injury, family law" },
          { label: "Does not accept", value: "Criminal defense" },
        ],
      }),
      section("hours", {
        fields: [
          { label: "Regular hours", value: "Mon–Fri 9am–5pm" },
          { label: "Holiday rules", value: "Closed on federal holidays" },
        ],
      }),
      section("callback_policy", {
        fields: [
          { label: "Policy", value: "Schedule callbacks within 1 business day; urgent matters routed to on-call attorney." },
        ],
      }),
      section("escalation_contacts", {
        visibility: "internal",
        fields: [
          { label: "Intake manager", value: "" },
          { label: "After-hours attorney", value: "" },
        ],
      }),
      section("special_handling", {
        label: "Conflict checks",
        fields: [{ label: "Procedure", value: "Capture full name and opposing party before booking a consultation." }],
      }),
      section("faqs", {
        fields: [
          { label: "Do you offer free consultations?", value: "Yes — initial consultations are complimentary." },
          { label: "What documents should I bring?", value: "" },
        ],
      }),
      section("exceptions", {
        fields: [{ label: "Do-not-do list", value: "Never give legal advice; never quote fees over the phone." }],
      }),
      section("internal_notes", {
        visibility: "internal",
        fields: [{ label: "Notes for the team", value: "" }],
      }),
    ],
  };
}

export const WORKSPACE_GUIDE_TEMPLATES: WorkspaceGuideTemplate[] = [
  {
    id: "generic",
    name: "Generic starter",
    description: "Neutral starter set of sections suitable for any vertical.",
    vertical: "generic",
    build: buildGenericTemplate,
  },
  {
    id: "legal-firm-starter",
    name: "Legal firm starter",
    description: "Pre-populated for a law firm: practice areas, conflict checks, attorney escalation.",
    vertical: "legal",
    build: buildLegalFirmStarterTemplate,
  },
];

export function getTemplate(id: string): WorkspaceGuideTemplate | undefined {
  return WORKSPACE_GUIDE_TEMPLATES.find((t) => t.id === id);
}
