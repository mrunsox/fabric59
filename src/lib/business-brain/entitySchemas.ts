/**
 * Business Brain — Phase 1 entity payload schemas.
 *
 * One Zod schema per `BbEntityType`. These define the contract for the JSONB
 * `payload` column on both `bb_extractions` and `bb_facts`. Adding fields is
 * additive; removing fields is a breaking change and must be reviewed.
 *
 * `canonicalKey(entity_type, payload)` produces a stable, normalized merge
 * key used by the approval flow to detect duplicates BEFORE writing a new
 * fact. Slice 1 only uses this key for the explicit merge UI — there is no
 * silent auto-merge.
 */
import { z } from "zod";
import type { BbEntityType } from "./types";

const trimmed = z
  .string()
  .trim()
  .min(1, "value is required");

export const departmentSchema = z.object({
  name: trimmed,
  description: z.string().trim().optional(),
});

export const serviceSchema = z.object({
  name: trimmed,
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export const staffSchema = z.object({
  name: trimmed,
  role: z.string().trim().optional(),
  department: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
});

export const phoneSchema = z.object({
  label: trimmed,
  number: trimmed.refine(
    (v) => v.replace(/\D+/g, "").length >= 7,
    "phone number must contain at least 7 digits",
  ),
  extension: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

const weeklySchema = z
  .object({
    mon: z.string().trim().optional(),
    tue: z.string().trim().optional(),
    wed: z.string().trim().optional(),
    thu: z.string().trim().optional(),
    fri: z.string().trim().optional(),
    sat: z.string().trim().optional(),
    sun: z.string().trim().optional(),
  })
  .optional();

export const hoursSchema = z.object({
  label: trimmed,
  // Free-form text is always preserved as the source of truth.
  schedule: trimmed,
  // Slice 2: best-effort weekly normalization. Populated only when parsing
  // is confident. Callers must continue treating `schedule` as primary.
  weekly: weeklySchema,
  timezone: z.string().trim().optional(),
  appliesTo: z.string().trim().optional(),
});

export const destinationContactSchema = z.object({
  label: trimmed,
  channel: z.enum(["phone", "email", "url", "sms"]),
  value: trimmed,
  notes: z.string().trim().optional(),
});

export const faqSchema = z.object({
  question: trimmed,
  answer: trimmed,
  topic: z.string().trim().optional(),
  /** Optional Slice 2: explicit, reusable service this FAQ is about. */
  service: z.string().trim().optional(),
});

export const escalationContactSchema = z.object({
  label: trimmed,
  channel: z.enum(["phone", "email", "url"]),
  value: trimmed,
  triggerCondition: z.string().trim().optional(),
});

export const intakeRequirementSchema = z.object({
  label: trimmed,
  // Slice 2: dedupe + lowercase-trim so reviewers don't get noise like
  // ["Name", "name", "NAME"] from the same source.
  fields: z
    .array(trimmed)
    .min(1)
    .transform((arr) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of arr) {
        const k = v.toLowerCase().trim();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(k);
      }
      return out;
    }),
  appliesTo: z.string().trim().optional(),
});

export const policySchema = z.object({
  title: trimmed,
  // Slice 2: cap policy body length. Long policies must be split — keeps
  // approved knowledge tight and reduces drift.
  body: trimmed.max(500, "policy body must be 500 characters or fewer"),
  category: z.string().trim().optional(),
});

export const ENTITY_SCHEMAS = {
  department: departmentSchema,
  service: serviceSchema,
  staff: staffSchema,
  phone: phoneSchema,
  hours: hoursSchema,
  destination_contact: destinationContactSchema,
  faq: faqSchema,
  escalation_contact: escalationContactSchema,
  intake_requirement: intakeRequirementSchema,
  policy: policySchema,
} as const satisfies Record<BbEntityType, z.ZodTypeAny>;

export function validateEntityPayload(
  entityType: BbEntityType,
  payload: unknown,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const schema = ENTITY_SCHEMAS[entityType];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, data: parsed.data };
}

function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(s: unknown): string {
  return String(s ?? "").replace(/\D+/g, "");
}

/**
 * Stable, normalized merge key per entity_type. Used to surface duplicate
 * candidates in the approval UI. Never silently merges; always shown for
 * explicit reviewer confirmation.
 */
export function canonicalKey(
  entityType: BbEntityType,
  payload: Record<string, unknown>,
): string {
  switch (entityType) {
    case "phone":
      return `phone:${digitsOnly(payload.number)}`;
    case "staff":
      return `staff:${normalize(payload.name)}`;
    case "department":
      return `dept:${normalize(payload.name)}`;
    case "service":
      return `svc:${normalize(payload.name)}`;
    case "hours":
      return `hours:${normalize(payload.label)}`;
    case "destination_contact":
      return `dest:${normalize(payload.channel)}:${normalize(payload.value)}`;
    case "escalation_contact":
      return `esc:${normalize(payload.channel)}:${normalize(payload.value)}`;
    case "faq":
      return `faq:${normalize(payload.question).slice(0, 200)}`;
    case "intake_requirement":
      return `intake:${normalize(payload.label)}`;
    case "policy":
      return `policy:${normalize(payload.title)}`;
  }
}

export function displayName(
  entityType: BbEntityType,
  payload: Record<string, unknown>,
): string {
  switch (entityType) {
    case "phone":
      return String(payload.label ?? payload.number ?? "Phone");
    case "staff":
      return String(payload.name ?? "Staff");
    case "department":
      return String(payload.name ?? "Department");
    case "service":
      return String(payload.name ?? "Service");
    case "hours":
      return String(payload.label ?? "Hours");
    case "destination_contact":
      return String(payload.label ?? payload.value ?? "Destination");
    case "escalation_contact":
      return String(payload.label ?? payload.value ?? "Escalation");
    case "faq":
      return String(payload.question ?? "FAQ").slice(0, 120);
    case "intake_requirement":
      return String(payload.label ?? "Intake requirement");
    case "policy":
      return String(payload.title ?? "Policy");
  }
}

export const ENTITY_LABEL: Record<BbEntityType, string> = {
  department: "Department",
  service: "Service",
  staff: "Staff",
  phone: "Phone",
  hours: "Hours",
  destination_contact: "Destination contact",
  faq: "FAQ",
  escalation_contact: "Escalation contact",
  intake_requirement: "Intake requirement",
  policy: "Policy",
};
