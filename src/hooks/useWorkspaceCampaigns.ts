import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Canonical workspace campaigns (Phase 3).
 *
 * Reads from the canonical `campaigns` table. Legacy `campaign_setups` rows
 * are mirrored in by a DB trigger, so this hook is the single read surface
 * for the canonical workspace UI regardless of which writer (legacy admin
 * page or future canonical builder) created the row.
 */
export type WorkspaceCampaign = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  name: string;
  status: "draft" | "ready" | "live" | "paused" | "archived";
  source_type: string | null;
  source_id: string | null;
  legacy_status: string | null;
  created_at: string;
  updated_at: string;
};

export function useWorkspaceCampaigns() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-campaigns", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceCampaign[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, workspace_id, client_id, name, status, source_type, source_id, legacy_status, created_at, updated_at")
        .eq("workspace_id", workspace!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceCampaign[];
    },
  });
}

export function useWorkspaceCampaign(campaignId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-campaign", workspace?.id ?? null, campaignId ?? null],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<WorkspaceCampaign | null> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, workspace_id, client_id, name, status, source_type, source_id, legacy_status, created_at, updated_at")
        .eq("id", campaignId!)
        .eq("workspace_id", workspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspaceCampaign | null) ?? null;
    },
  });
}
