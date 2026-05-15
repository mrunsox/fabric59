/**
 * Zod schema for FormSchemaV1 + idempotent legacy migrator.
 *
 * Used by the builder on load (migrate-then-validate), the runner on
 * render (validate before paint), and the regression suite as the
 * canonical contract.
 */
import { z } from "zod";
import {
  FORM_SCHEMA_VERSION,
  cryptoRandomId,
  type FormField,
  type FormSchemaV1,
  type FormSection,
} from "@/types/form-schema";

const FIELD_TYPES = [
  "text", "textarea", "email", "phone", "url", "number", "currency",
  "date", "time", "datetime", "select", "multiselect", "radio",
  "checkbox", "checkbox_group", "toggle", "file", "signature",
  "address", "rating", "slider", "hidden", "divider", "heading",
] as const;

const fieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const fieldValidationSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});

const fieldAiSchema = z.object({
  enabled: z.boolean(),
  prompt: z.string().optional(),
});

const fieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  label: z.string(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: fieldValidationSchema.optional(),
  roleLock: z.enum(["agent", "supervisor", "admin"]).nullable().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  ai: fieldAiSchema.optional(),
  mapping: z.string().optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(fieldSchema),
});

const conditionSchema = z.object({
  fieldKey: z.string().min(1),
  op: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "is_empty", "is_not_empty", "gt", "lt",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const conditionGroupSchema = z.object({
  all: z.array(conditionSchema),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("jump_to_section"), sectionId: z.string().min(1) }),
  z.object({ type: z.literal("end_with_outcome"), outcomeKey: z.string().min(1) }),
  z.object({ type: z.literal("trigger_notification"), notificationKey: z.string().min(1) }),
  z.object({
    type: z.literal("prefill"),
    fieldKey: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({ type: z.literal("show_field"), fieldKey: z.string().min(1) }),
  z.object({ type: z.literal("hide_field"), fieldKey: z.string().min(1) }),
  z.object({ type: z.literal("require_field"), fieldKey: z.string().min(1) }),
]);

const ruleSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  groups: z.array(conditionGroupSchema),
  actions: z.array(actionSchema),
  enabled: z.boolean().optional(),
});

const outcomeSchema = z.object({
  key: z.string().min(1),
  label: z.string(),
  dispositionKey: z.string().optional(),
  description: z.string().optional(),
});

export const formSchemaV1Zod = z.object({
  schemaVersion: z.literal(FORM_SCHEMA_VERSION),
  sections: z.array(sectionSchema).min(1, "At least one section is required"),
  logic: z.array(ruleSchema),
  outcomes: z.array(outcomeSchema),
});

export type ParsedFormSchemaV1 = z.infer<typeof formSchemaV1Zod>;

/**
 * Idempotent migrator from any legacy/unknown shape to FormSchemaV1.
 *
 * Inputs handled:
 *   - Already-V1 payloads → returned as-is (after re-validation).
 *   - Legacy `{ fields: FormField[] }` lead-capture stub → wrapped into one section.
 *   - Empty / null / non-object → returns `emptyFormSchemaV1()`.
 *
 * Always returns a payload that passes `formSchemaV1Zod.safeParse`.
 */
export function migrateLegacyFormSchema(legacy: unknown): FormSchemaV1 {
  // Fast-path: empty / non-object.
  if (!legacy || typeof legacy !== "object") {
    return makeEmpty();
  }
  const obj = legacy as Record<string, unknown>;

  // Already V1.
  if (obj.schemaVersion === FORM_SCHEMA_VERSION && Array.isArray(obj.sections)) {
    const parsed = formSchemaV1Zod.safeParse(obj);
    if (parsed.success) return parsed.data as FormSchemaV1;
    // Repair: drop unknown keys, re-build minimal valid shape from sections.
    return {
      schemaVersion: FORM_SCHEMA_VERSION,
      sections: (obj.sections as FormSection[]).map(normaliseSection),
      logic: Array.isArray(obj.logic) ? (obj.logic as FormSchemaV1["logic"]) : [],
      outcomes: Array.isArray(obj.outcomes) ? (obj.outcomes as FormSchemaV1["outcomes"]) : [],
    };
  }

  // Legacy lead-capture: { fields: FormField[], confirmation?: string }
  if (Array.isArray(obj.fields)) {
    const fields = (obj.fields as Array<Record<string, unknown>>).map(normaliseLegacyField);
    return {
      schemaVersion: FORM_SCHEMA_VERSION,
      sections: [
        {
          id: cryptoRandomId(),
          title: "Section 1",
          description: typeof obj.confirmation === "string" ? "" : "",
          fields,
        },
      ],
      logic: [],
      outcomes: [],
    };
  }

  return makeEmpty();
}

function makeEmpty(): FormSchemaV1 {
  return {
    schemaVersion: FORM_SCHEMA_VERSION,
    sections: [
      { id: cryptoRandomId(), title: "Section 1", description: "", fields: [] },
    ],
    logic: [],
    outcomes: [],
  };
}

function normaliseSection(raw: FormSection): FormSection {
  return {
    id: raw.id || cryptoRandomId(),
    title: raw.title || "Untitled section",
    description: raw.description ?? "",
    fields: Array.isArray(raw.fields) ? raw.fields.map((f) => normaliseField(f)) : [],
  };
}

function normaliseField(f: FormField): FormField {
  const allowed = new Set(FIELD_TYPES);
  const type = (allowed.has(f.type) ? f.type : "text") as FormField["type"];
  return {
    ...f,
    id: f.id || cryptoRandomId(),
    key: f.key || `field_${(f.id ?? cryptoRandomId()).slice(0, 6)}`,
    type,
    label: f.label || "Untitled field",
  };
}

function normaliseLegacyField(raw: Record<string, unknown>): FormField {
  return normaliseField({
    id: (raw.id as string) || cryptoRandomId(),
    key: (raw.key as string) || `field_${cryptoRandomId().slice(0, 6)}`,
    type: ((raw.type as FormField["type"]) ?? "text"),
    label: (raw.label as string) || "Untitled field",
    helpText: raw.helpText as string | undefined,
    placeholder: raw.placeholder as string | undefined,
    required: Boolean(raw.required),
    options: Array.isArray(raw.options) ? (raw.options as FormField["options"]) : undefined,
    mapping: raw.mapping as string | undefined,
  });
}
