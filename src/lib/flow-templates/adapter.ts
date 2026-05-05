// Single seam for accessing flow templates.
// v1 returns the static catalog. v2 can swap to a Supabase-backed
// `flow_templates` table without changing any caller.

import { FLOW_TEMPLATES, type FlowTemplate } from "@/data/flow-templates";
import type { TemplateKey } from "@/data/connector-actions";

export type { FlowTemplate, FlowDefinition } from "@/data/flow-templates";
export type { TemplateKey } from "@/data/connector-actions";

export async function listTemplates(): Promise<FlowTemplate[]> {
  return FLOW_TEMPLATES;
}

export function listTemplatesSync(): FlowTemplate[] {
  return FLOW_TEMPLATES;
}

export async function getTemplateByKey(key: string | TemplateKey | null | undefined): Promise<FlowTemplate | null> {
  if (!key) return null;
  return FLOW_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function getTemplateByKeySync(key: string | TemplateKey | null | undefined): FlowTemplate | null {
  if (!key) return null;
  return FLOW_TEMPLATES.find((t) => t.key === key) ?? null;
}
