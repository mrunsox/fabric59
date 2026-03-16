import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function usePostCallAutomations() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["post_call_automations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("post_call_automations")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreatePostCallAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      organization_id: string;
      name: string;
      disposition_match: string;
      action_type: string;
      config?: Json;
      script_id?: string;
      tenant_id?: string;
      enabled?: boolean;
    }) => {
      const { data, error } = await supabase.from("post_call_automations").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post_call_automations"] });
      toast.success("Automation rule created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePostCallAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      name?: string;
      disposition_match?: string;
      action_type?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }) => {
      const { data, error } = await supabase.from("post_call_automations").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post_call_automations"] });
      toast.success("Automation rule updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePostCallAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_call_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post_call_automations"] });
      toast.success("Automation rule deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
