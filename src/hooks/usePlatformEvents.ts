import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EmitEventInput {
  event_type: string;
  payload?: Record<string, unknown>;
  source?: string;
  correlation_id?: string;
}

export function usePlatformEvents(eventType?: string) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["platform-events", organization?.id, eventType],
    queryFn: async () => {
      if (!organization?.id) return [];
      let q = supabase
        .from("platform_events")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (eventType) q = q.eq("event_type", eventType);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organization?.id,
  });
}

export function useEmitEvent() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: EmitEventInput) => {
      if (!organization?.id) throw new Error("No organization");
      const { error } = await supabase.from("platform_events").insert({
        organization_id: organization.id,
        event_type: input.event_type,
        payload: input.payload ?? {},
        source: input.source ?? "client",
        correlation_id: input.correlation_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-events"] });
    },
  });
}
