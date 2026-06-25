import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampaignStatus = "draft" | "ready" | "live" | "paused" | "archived";

export type CampaignFormValues = {
  name: string;
  status: CampaignStatus;
};

export function useUpdateWorkspaceCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CampaignFormValues }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: values.name.trim(),
          status: values.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-campaigns"] });
      qc.invalidateQueries({ queryKey: ["workspace-campaign", vars.id] });
      toast.success("Campaign updated");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to update campaign"),
  });
}

export function useDeleteWorkspaceCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to delete campaign"),
  });
}
