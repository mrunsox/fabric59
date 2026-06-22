/**
 * Canonical campaign readiness — single source of truth.
 *
 * Used by both:
 *  - `CampaignReadinessChecklist` (per-campaign detail card)
 *  - `useWorkspaceSetupReadiness` (workspace-level setup checklist)
 *
 * The four checks are fed strictly by canonical tables. No competing
 * readiness definition should be added elsewhere — extend this helper
 * instead so every surface stays consistent.
 */
import { supabase } from "@/integrations/supabase/client";
import { CAMPAIGN_FLOW_SENTINEL_NAME } from "@/types/campaign-flow";
import { WORKSPACE_GUIDE_SINGLETON_NAME } from "@/types/workspace-guide";

export interface CanonicalCampaignReadiness {
  firmGuide: boolean;
  flow: boolean;
  intake: boolean;
  notifications: boolean;
}

export const EMPTY_CAMPAIGN_READINESS: CanonicalCampaignReadiness = {
  firmGuide: false,
  flow: false,
  intake: false,
  notifications: false,
};

export function isCampaignReady(r: CanonicalCampaignReadiness): boolean {
  return r.firmGuide && r.flow && r.intake && r.notifications;
}

export function countReady(r: CanonicalCampaignReadiness): number {
  return [r.firmGuide, r.flow, r.intake, r.notifications].filter(Boolean).length;
}

export async function fetchCanonicalCampaignReadiness(
  workspaceId: string,
  campaignId: string,
): Promise<CanonicalCampaignReadiness> {
  const { data: firm } = await supabase
    .from("guides")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("name", WORKSPACE_GUIDE_SINGLETON_NAME)
    .is("source_type", null)
    .maybeSingle();

  const { data: flow } = await supabase
    .from("guides")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("campaign_id", campaignId)
    .eq("name", CAMPAIGN_FLOW_SENTINEL_NAME)
    .maybeSingle();

  let hasNotification = false;
  const flowPublished = flow?.status === "published";
  if (flow?.id) {
    const { data: ver } = await supabase
      .from("guide_versions")
      .select("content")
      .eq("guide_id", flow.id)
      .eq("is_current", true)
      .maybeSingle();
    const steps =
      (ver?.content as { steps?: { type?: string }[] } | null)?.steps ?? [];
    hasNotification = steps.some((s) => s.type === "notification_trigger");
  }

  const { data: assignment } = await supabase
    .from("form_campaign_assignments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("campaign_id", campaignId)
    .limit(1)
    .maybeSingle();

  return {
    firmGuide: firm?.status === "published",
    flow: flowPublished,
    intake: !!assignment,
    notifications: hasNotification,
  };
}
