import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { WORKSPACE_GUIDE_SINGLETON_NAME } from "@/types/workspace-guide";

/**
 * Phase 4: Canonical Guides hooks.
 *
 * Reads the canonical `guides` table. Legacy `scripts` rows are mirrored in
 * via the `mirror_script_to_guide` DB trigger, so this is a single read
 * surface regardless of which writer (legacy ScriptBuilderPage or future
 * canonical guide builder) created the row.
 */
export type WorkspaceGuide = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  current_version: number;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function useWorkspaceGuides(opts?: { campaignId?: string | null }) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-guides", workspace?.id ?? null, opts?.campaignId ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceGuide[]> => {
      let q = supabase
        .from("guides")
        .select("id, workspace_id, campaign_id, name, description, status, current_version, source_type, source_id, metadata, created_at, updated_at")
        .eq("workspace_id", workspace!.id)
        .neq("name", WORKSPACE_GUIDE_SINGLETON_NAME)
        .order("updated_at", { ascending: false });
      if (opts?.campaignId) q = q.eq("campaign_id", opts.campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorkspaceGuide[];
    },
  });
}

export function useWorkspaceGuide(guideId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-guide", workspace?.id ?? null, guideId ?? null],
    enabled: !!workspace && !!guideId,
    queryFn: async (): Promise<WorkspaceGuide | null> => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, workspace_id, campaign_id, name, description, status, current_version, source_type, source_id, metadata, created_at, updated_at")
        .eq("id", guideId!)
        .eq("workspace_id", workspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspaceGuide | null) ?? null;
    },
  });
}

export function useAssignGuideToCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guideId, campaignId }: { guideId: string; campaignId: string | null }) => {
      const { error } = await supabase
        .from("guides")
        .update({ campaign_id: campaignId })
        .eq("id", guideId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      qc.invalidateQueries({ queryKey: ["workspace-guide"] });
      toast.success("Guide assignment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
