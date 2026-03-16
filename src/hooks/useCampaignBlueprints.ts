import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CampaignBlueprint {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  departments: { name: string; ivr_prompt: string; skill: string; script_text: string }[];
  agent_scripts: { department: string; script_text: string }[];
  agent_guide: string;
  dispositions: { name: string; type: string; email_routing: string }[];
  ivr_flow: { greeting: string; menu_options: { key: string; label: string; department: string }[]; after_hours: string };
  phone_numbers: { type: string; number: string; label: string }[];
  connectors: { name: string; type: string; url: string; notes: string }[];
  notes: string | null;
  tags: string[];
  documents: { name: string; path: string; uploaded_at: string }[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCampaignBlueprints() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  return useQuery({
    queryKey: ["campaign-blueprints", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_blueprints" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CampaignBlueprint[];
    },
  });
}

export function useCreateBlueprint() {
  const qc = useQueryClient();
  const { organization, user } = useAuth();
  return useMutation({
    mutationFn: async (bp: Partial<CampaignBlueprint>) => {
      const { data, error } = await supabase
        .from("campaign_blueprints" as any)
        .insert({ ...bp, organization_id: organization?.id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CampaignBlueprint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-blueprints"] });
      toast.success("Blueprint saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignBlueprint> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaign_blueprints" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CampaignBlueprint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-blueprints"] });
      toast.success("Blueprint updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_blueprints" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-blueprints"] });
      toast.success("Blueprint deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
