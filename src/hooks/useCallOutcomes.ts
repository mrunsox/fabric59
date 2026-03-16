import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCallOutcomeTypes() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["call_outcome_types", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("call_outcome_types")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCallOutcomeType() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("call_outcome_types")
        .insert({ ...input, organization_id: organization.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_outcome_types"] });
      toast.success("Outcome type created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCallOutcomes(callSessionId?: string) {
  return useQuery({
    queryKey: ["call_outcomes", callSessionId],
    queryFn: async () => {
      if (!callSessionId) return [];
      const { data, error } = await supabase
        .from("call_outcomes")
        .select("*, call_outcome_types(name, category)")
        .eq("call_session_id", callSessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId,
  });
}

export function useCreateCallOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { call_session_id: string; outcome_type_id: string; disposition?: string; summary?: string }) => {
      const { data, error } = await supabase.from("call_outcomes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_outcomes"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
