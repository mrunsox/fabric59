import { z } from "zod";
import {
  CAMPAIGN_FLOW_SCHEMA_VERSION,
  EMPTY_CAMPAIGN_FLOW,
  type CampaignFlowContent,
  type FlowStep,
} from "@/types/campaign-flow";

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  goto: z.string().nullable().optional(),
});

const conditionSchema = z.object({
  id: z.string().min(1),
  source: z.string(),
  op: z.enum(["eq", "neq", "in", "not_in", "contains", "gt", "lt", "is_set", "is_empty"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

const groupSchema = z.object({
  id: z.string().min(1),
  combinator: z.enum(["AND", "OR"]),
  conditions: z.array(conditionSchema),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  groups: z.array(groupSchema),
  action: z.union([
    z.object({ type: z.literal("show_step"), stepId: z.string() }),
    z.object({ type: z.literal("hide_step"), stepId: z.string() }),
    z.object({ type: z.literal("jump_to"), stepId: z.string() }),
    z.object({ type: z.literal("require_field"), fieldKey: z.string() }),
    z.object({ type: z.literal("enable_escalation"), targetId: z.string() }),
    z.object({ type: z.literal("enable_notification"), targetId: z.string() }),
  ]),
});

const stepSchema: z.ZodType<FlowStep> = z.object({
  id: z.string().min(1),
  type: z.enum([
    "question_branch",
    "information_display",
    "field_capture",
    "outcome_disposition",
    "escalation_trigger",
    "notification_trigger",
    "end_flow",
  ]),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  required: z.boolean(),
  enabled: z.boolean(),
  nextStepId: z.string().nullable().optional(),
  rules: z.array(ruleSchema),
  config: z.record(z.unknown()).or(z.object({}).passthrough()),
}) as unknown as z.ZodType<FlowStep>;

const mappingSchema = z.object({
  id: z.string().min(1),
  sourceKey: z.string(),
  destinationKey: z.string(),
  destinationProvider: z.string().optional(),
  notes: z.string().optional(),
});

export const campaignFlowContentSchema = z.object({
  schemaVersion: z.literal(CAMPAIGN_FLOW_SCHEMA_VERSION),
  steps: z.array(stepSchema),
  mappings: z.array(mappingSchema),
});

export function migrateCampaignFlowContent(raw: unknown): CampaignFlowContent {
  const parsed = campaignFlowContentSchema.safeParse(raw);
  if (parsed.success) return parsed.data as CampaignFlowContent;
  return { ...EMPTY_CAMPAIGN_FLOW, steps: [], mappings: [] };
}

export function newFlowId(prefix = "stp"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
