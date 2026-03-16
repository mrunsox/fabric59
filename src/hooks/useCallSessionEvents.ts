import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export function useCallSessionEvents(callSessionId?: string) {
  return useQuery({
    queryKey: ["call_session_events", callSessionId],
    queryFn: async () => {
      if (!callSessionId) return [];
      const { data, error } = await supabase
        .from("call_session_events")
        .select("*")
        .eq("call_session_id", callSessionId)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId,
  });
}

export function useCreateCallSessionEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      call_session_id: string;
      event_type: string;
      node_id?: string;
      data?: Json;
    }) => {
      const { data, error } = await supabase
        .from("call_session_events")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["call_session_events", vars.call_session_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
