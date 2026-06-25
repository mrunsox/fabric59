import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type CampaignLibrarySource = {
  id: string;
  title: string;
  kind: string;
  uri: string | null;
  status: string;
  status_message: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export function useCampaignLibrarySources(campaignId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["campaign-library", workspace?.id ?? null, campaignId ?? null],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<CampaignLibrarySource[]> => {
      const { data, error } = await supabase
        .from("bb_sources")
        .select("id, title, kind, uri, status, status_message, created_at, metadata")
        .eq("workspace_id", workspace!.id)
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignLibrarySource[];
    },
  });
}

export function useAddCampaignLibrarySource(campaignId: string | undefined) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      kind: "upload" | "url" | "text";
      uri?: string | null;
      content?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!workspace || !campaignId) throw new Error("Workspace/campaign required");
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase
        .from("bb_sources")
        .insert({
          workspace_id: workspace.id,
          campaign_id: campaignId,
          kind: input.kind,
          title: input.title,
          uri: input.uri ?? null,
          status: "pending",
          metadata: { ...(input.metadata ?? {}), content: input.content ?? null },
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-library"] });
      toast.success("Added to library");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to add source"),
  });
}

export function useDeleteCampaignLibrarySource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bb_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-library"] });
      toast.success("Removed from library");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to remove source"),
  });
}
