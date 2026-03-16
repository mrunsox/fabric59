import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCampaignScripts() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["campaign_scripts", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("campaign_scripts")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCampaignScript() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      script_id: string;
      dnis?: string;
      five9_campaign_id?: string;
      five9_domain_id?: string;
      partner_id?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("campaign_scripts")
        .insert({ ...input, organization_id: organization.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_scripts"] });
      toast.success("Script routing created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCampaignScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; script_id?: string; dnis?: string; five9_campaign_id?: string }) => {
      const { error } = await supabase.from("campaign_scripts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_scripts"] });
      toast.success("Routing updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCampaignScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_scripts"] });
      toast.success("Routing deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
