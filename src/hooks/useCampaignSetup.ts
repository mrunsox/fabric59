import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CampaignIntakeData, CampaignSetup, DEFAULT_CHECKLIST } from "@/types/campaign";

export function useCampaignSetups() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["campaign_setups", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("campaign_setups")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CampaignSetup[];
    },
    enabled: !!organization?.id,
  });
}

export function useCampaignSetup(id: string | undefined) {
  return useQuery({
    queryKey: ["campaign_setup", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("campaign_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CampaignSetup | null;
    },
    enabled: !!id,
  });
}

export function useSaveCampaignSetup() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      campaignName: string;
      clientName: string;
      intakeData: CampaignIntakeData;
      checklistState: Record<string, { done: boolean; blocked?: string }>;
      status: string;
      notes?: string;
      priority: string;
      targetGoLive?: string;
      fiveDomainId?: string;
    }) => {
      const payload = {
        organization_id: organization!.id,
        campaign_name: params.campaignName,
        client_name: params.clientName,
        intake_data: JSON.parse(JSON.stringify(params.intakeData)),
        checklist_state: JSON.parse(JSON.stringify(params.checklistState)),
        status: params.status,
        notes: params.notes || null,
        priority: params.priority,
        target_go_live: params.targetGoLive || null,
        five9_domain_id: params.fiveDomainId || null,
        created_by: user?.id || null,
      };

      if (params.id) {
        const { data, error } = await supabase
          .from("campaign_setups")
          .update(payload)
          .eq("id", params.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("campaign_setups")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setups"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
    },
    onError: (error) => {
      toast.error("Failed to save campaign: " + error.message);
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, checklistState }: { id: string; checklistState: Record<string, { done: boolean; blocked?: string }> }) => {
      const { error } = await supabase
        .from("campaign_setups")
        .update({ checklist_state: JSON.parse(JSON.stringify(checklistState)) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
    },
  });
}

export function useFive9Prompts() {
  return useQuery({
    queryKey: ["five9_prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getPrompts" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch prompts");
      return (data.prompts as string[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useFive9Dispositions() {
  return useQuery({
    queryKey: ["five9_dispositions_list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getDispositions" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch dispositions");
      return (data.dispositions as string[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
