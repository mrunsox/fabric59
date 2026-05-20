/**
 * FormSchemaV1 — canonical schema-driven decision-tree intake.
 *
 * Replaces the legacy `{ fields: FormField[] }` lead-capture stub. The
 * runner persists nothing of its own; the builder hydrates this shape from
 * `forms.schema` jsonb and writes it back through `useUpdateFormSchema`.
 *
 * NOTE: Bump `schemaVersion` and add a migrator branch in
 * `migrateLegacyFormSchema` whenever this shape evolves.
 */

export const FORM_SCHEMA_VERSION = 1 as const;

/**
 * Canonical field types. Additions are backward-compatible: legacy data that
 * never used a new type is still valid V1, so FORM_SCHEMA_VERSION stays at 1.
 *
 * Agent-presentation types added in Checkpoint 1:
 *   - `info`           rich note shown to the agent (read-only). Uses `content`.
 *   - `script_block`   "say this" script line with accent treatment. Uses `content`.
 *   - `connector_link` labeled URL chip (FAQ, calendar, pricing). Uses `href` + `label`.
 */
export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "checkbox_group"
  | "toggle"
  | "file"
  | "signature"
  | "address"
  | "rating"
  | "slider"
  | "hidden"
  | "divider"
  | "heading"
  | "info"
  | "script_block"
  | "connector_link";

export type FormFieldOption = { label: string; value: string };

export type FormFieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
};

export type FormFieldAiDisplay = {
  /** Show an inline AI-suggested answer pulled from the call context. */
  enabled: boolean;
  /** Optional natural-language hint used by the assistant to source a value. */
  prompt?: string;
};

export interface FormField {
  id: string;
  /** Stable machine key used in submissions + logic conditions. */
  key: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  /** Lock visibility/edit to a specific workspace role. */
  roleLock?: "agent" | "supervisor" | "admin" | null;
  /** Default value or template (e.g., {{caller.firstName}}). */
  defaultValue?: string | number | boolean | null;
  ai?: FormFieldAiDisplay;
  /** Where this value lands when the submission is mapped (dot-path). */
  mapping?: string;
  /** Body text for `info` / `script_block` (markdown-lite). */
  content?: string;
  /** External URL target for `connector_link`. */
  href?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export type LogicConditionOp =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "lt";

export interface LogicCondition {
  fieldKey: string;
  op: LogicConditionOp;
  value?: string | number | boolean;
}

export type LogicConditionGroup = {
  /** AND across the group; LogicRule then ORs across groups. */
  all: LogicCondition[];
};

export type LogicAction =
  | { type: "jump_to_section"; sectionId: string }
  | { type: "end_with_outcome"; outcomeKey: string }
  | { type: "trigger_notification"; notificationKey: string }
  | { type: "prefill"; fieldKey: string; value: string | number | boolean }
  | { type: "show_field"; fieldKey: string }
  | { type: "hide_field"; fieldKey: string }
  | { type: "require_field"; fieldKey: string };

export interface LogicRule {
  id: string;
  name?: string;
  /** OR across groups; AND within each group. */
  groups: LogicConditionGroup[];
  actions: LogicAction[];
  enabled?: boolean;
}

export interface OutcomeRef {
  key: string;
  label: string;
  /** Optional canonical disposition mapping. */
  dispositionKey?: string;
  description?: string;
  /** Optional list of email addresses notified when this outcome fires. */
  notificationEmails?: string[];
}

export interface FormSchemaV1 {
  schemaVersion: 1;
  sections: FormSection[];
  logic: LogicRule[];
  outcomes: OutcomeRef[];
}

/** Empty but valid V1 — every new form starts here. */
export function emptyFormSchemaV1(): FormSchemaV1 {
  return {
    schemaVersion: FORM_SCHEMA_VERSION,
    sections: [
      {
        id: cryptoRandomId(),
        title: "Section 1",
        description: "",
        fields: [],
      },
    ],
    logic: [],
    outcomes: [],
  };
}

export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
