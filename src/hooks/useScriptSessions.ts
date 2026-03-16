import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useScriptSessions(limit = 50) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["script_sessions", orgId, limit],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("script_sessions")
        .select("*")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateScriptSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      script_id?: string;
      organization_id: string;
      tenant_id?: string;
      agent_id?: string;
      five9_call_id?: string;
      variables?: Record<string, unknown>;
      disposition?: string;
    }) => {
      const { data, error } = await supabase.from("script_sessions").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["script_sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteScriptSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      ended_at?: string;
      duration_seconds?: number;
      variables?: Record<string, unknown>;
      disposition?: string;
      post_call_status?: string;
    }) => {
      const { data, error } = await supabase.from("script_sessions").update({
        ended_at: values.ended_at || new Date().toISOString(),
        ...values,
      }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["script_sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
