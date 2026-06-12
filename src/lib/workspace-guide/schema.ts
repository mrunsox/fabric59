import { z } from "zod";
import {
  EMPTY_WORKSPACE_GUIDE,
  WORKSPACE_GUIDE_SCHEMA_VERSION,
  type WorkspaceGuideContentV2,
} from "@/types/workspace-guide";

const sectionKindSchema = z.enum([
  "greeting",
  "business_overview",
  "service_descriptions",
  "specialties",
  "hours",
  "callback_policy",
  "escalation_contacts",
  "special_handling",
  "faqs",
  "exceptions",
  "internal_notes",
  "custom",
]);

const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  value: z.string(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  kind: sectionKindSchema,
  label: z.string(),
  description: z.string().optional(),
  helper: z.string().optional(),
  visibility: z.enum(["agent", "internal"]),
  required: z.boolean(),
  enabled: z.boolean(),
  fields: z.array(fieldSchema),
});

export const workspaceGuideContentV2Schema = z.object({
  schemaVersion: z.literal(WORKSPACE_GUIDE_SCHEMA_VERSION),
  sections: z.array(sectionSchema),
});

/** Safe migrator — anything not v2 collapses to empty. */
export function migrateWorkspaceGuideContent(raw: unknown): WorkspaceGuideContentV2 {
  const parsed = workspaceGuideContentV2Schema.safeParse(raw);
  if (parsed.success) return parsed.data as WorkspaceGuideContentV2;
  return { ...EMPTY_WORKSPACE_GUIDE, sections: [] };
}

export function assertWorkspaceGuideContent(value: unknown): WorkspaceGuideContentV2 {
  return workspaceGuideContentV2Schema.parse(value) as WorkspaceGuideContentV2;
}

export function newId(prefix = "s"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
