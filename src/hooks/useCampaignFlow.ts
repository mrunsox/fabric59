import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CAMPAIGN_FLOW_SENTINEL_KIND,
  CAMPAIGN_FLOW_SENTINEL_NAME,
  type CampaignFlowContent,
} from "@/types/campaign-flow";
import { migrateCampaignFlowContent } from "@/lib/campaign-flow/schema";

/**
 * Phase 5 — Canonical Campaign Flow (decision-tree builder).
 *
 * Reuses Phase 4 storage primitives without schema changes:
 *   guides row per campaign with name '__campaign_flow__'
 *   metadata.kind = 'campaign_flow'
 * Versions live in guide_versions.content as { schemaVersion: 1, steps, mappings }.
 */

export type CampaignFlowRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  status: "draft" | "published" | "archived";
  current_version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CampaignFlowVersionRow = {
  id: string;
  version: number;
  is_current: boolean;
  content: CampaignFlowContent;
  created_by: string | null;
  created_at: string;
};

const KEY = ["campaign-flow"] as const;

async function findFlow(workspaceId: string, campaignId: string): Promise<CampaignFlowRow | null> {
  const { data, error } = await supabase
    .from("guides")
    .select("id, workspace_id, campaign_id, status, current_version, metadata, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("campaign_id", campaignId)
    .eq("name", CAMPAIGN_FLOW_SENTINEL_NAME)
    .maybeSingle();
  if (error) throw error;
  return (data as CampaignFlowRow | null) ?? null;
}

async function createFlow(workspaceId: string, campaignId: string, userId: string | null): Promise<CampaignFlowRow> {
  const { data, error } = await supabase
    .from("guides")
    .insert({
      workspace_id: workspaceId,
      campaign_id: campaignId,
      name: CAMPAIGN_FLOW_SENTINEL_NAME,
      description: "Canonical campaign flow",
      status: "draft",
      current_version: 1,
      metadata: { kind: CAMPAIGN_FLOW_SENTINEL_KIND, native: true } as never,
      created_by: userId,
    })
    .select("id, workspace_id, campaign_id, status, current_version, metadata, created_at, updated_at")
    .single();
  if (error) throw error;
  const { error: vErr } = await supabase.from("guide_versions").insert({
    guide_id: data.id,
    version: 1,
    content: { schemaVersion: 1, steps: [], mappings: [] } as never,
    is_current: false,
    created_by: userId,
  });
  if (vErr) throw vErr;
  return data as CampaignFlowRow;
}

export function useCampaignFlow(campaignId: string | undefined) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, "row", workspace?.id ?? null, campaignId ?? null],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<CampaignFlowRow> => {
      const existing = await findFlow(workspace!.id, campaignId!);
      if (existing) return existing;
      return createFlow(workspace!.id, campaignId!, user?.id ?? null);
    },
  });
}

export function useCampaignFlowVersions(flowId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "versions", flowId ?? null],
    enabled: !!flowId,
    queryFn: async (): Promise<CampaignFlowVersionRow[]> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, version, is_current, content, created_by, created_at")
        .eq("guide_id", flowId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        content: migrateCampaignFlowContent(r.content),
      })) as CampaignFlowVersionRow[];
    },
  });
}

export function useLatestCampaignFlowVersion(flowId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "latest", flowId ?? null],
    enabled: !!flowId,
    queryFn: async (): Promise<CampaignFlowVersionRow | null> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, version, is_current, content, created_by, created_at")
        .eq("guide_id", flowId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, content: migrateCampaignFlowContent(data.content) } as CampaignFlowVersionRow;
    },
  });
}

/**
 * Currently published flow for a campaign (the read used by the Phase 6
 * live runner). Returns null if nothing is published yet.
 */
export function usePublishedCampaignFlow(campaignId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: [...KEY, "published", workspace?.id ?? null, campaignId ?? null],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<CampaignFlowContent | null> => {
      const row = await findFlow(workspace!.id, campaignId!);
      if (!row) return null;
      const { data, error } = await supabase
        .from("guide_versions")
        .select("content")
        .eq("guide_id", row.id)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return migrateCampaignFlowContent(data.content);
    },
  });
}

export function useSaveCampaignFlowDraft() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ flowId, content }: { flowId: string; content: CampaignFlowContent }) => {
      const { data: latest, error: lErr } = await supabase
        .from("guide_versions")
        .select("version")
        .eq("guide_id", flowId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) throw lErr;
      const nextVersion = (latest?.version ?? 0) + 1;
      const { error } = await supabase.from("guide_versions").insert({
        guide_id: flowId,
        version: nextVersion,
        content: content as never,
        is_current: false,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      return nextVersion;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, "versions", vars.flowId] });
      qc.invalidateQueries({ queryKey: [...KEY, "latest", vars.flowId] });
      toast.success("Draft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePublishCampaignFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ flowId, version }: { flowId: string; version: number }) => {
      const { error: clearErr } = await supabase
        .from("guide_versions")
        .update({ is_current: false })
        .eq("guide_id", flowId);
      if (clearErr) throw clearErr;
      const { error: setErr } = await supabase
        .from("guide_versions")
        .update({ is_current: true })
        .eq("guide_id", flowId)
        .eq("version", version);
      if (setErr) throw setErr;
      const { error: gErr } = await supabase
        .from("guides")
        .update({ status: "published", current_version: version })
        .eq("id", flowId);
      if (gErr) throw gErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY] });
      toast.success(`Published v${vars.version}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Restore an older version: copies its content into a new draft. */
export function useRestoreCampaignFlowVersion() {
  const save = useSaveCampaignFlowDraft();
  return useMutation({
    mutationFn: async (input: { flowId: string; content: CampaignFlowContent }) =>
      save.mutateAsync({ flowId: input.flowId, content: input.content }),
  });
}
