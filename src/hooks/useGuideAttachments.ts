import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type WorkspaceGuideRef = {
  id: string;
  name: string;
  status: string;
  campaign_id: string | null;
  client_id: string | null;
};

export function useWorkspaceGuideList() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-guides-list", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceGuideRef[]> => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, name, status, campaign_id, client_id")
        .eq("workspace_id", workspace!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceGuideRef[];
    },
  });
}

export function useAttachGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      guideId: string;
      campaignId?: string | null;
      clientId?: string | null;
    }) => {
      const patch: Record<string, string | null> = {};
      if (input.campaignId !== undefined) patch.campaign_id = input.campaignId;
      if (input.clientId !== undefined) patch.client_id = input.clientId;
      const { error } = await supabase.from("guides").update(patch).eq("id", input.guideId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-guides-list"] });
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide updated");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to update guide"),
  });
}
