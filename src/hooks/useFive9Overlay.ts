import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Campaign Routes ────────────────────────────────────────────────
export function useFive9Routes(clientId?: string) {
  return useQuery({
    queryKey: ["five9-routes", clientId],
    queryFn: async () => {
      let q = supabase.from("five9_campaign_routes").select("*").order("priority", { ascending: true });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertFive9Route() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await supabase.from("five9_campaign_routes").update(row).eq("id", row.id).select().single()
        : await supabase.from("five9_campaign_routes").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["five9-routes"] });
      toast.success("Route saved");
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useDeleteFive9Route() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("five9_campaign_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["five9-routes"] });
      toast.success("Route removed");
    },
  });
}

// ── Call Variables ─────────────────────────────────────────────────
export function useFive9CallVariableGroups(clientId?: string) {
  return useQuery({
    queryKey: ["five9-var-groups", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("five9_call_variable_groups")
        .select("*")
        .eq("client_id", clientId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useFive9CallVariables(clientId?: string) {
  return useQuery({
    queryKey: ["five9-call-vars", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("five9_call_variables")
        .select("*")
        .eq("client_id", clientId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useUpsertCallVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await supabase.from("five9_call_variables").update(row).eq("id", row.id).select().single()
        : await supabase.from("five9_call_variables").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["five9-call-vars"] });
      toast.success("Call variable saved");
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useDeleteCallVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("five9_call_variables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["five9-call-vars"] });
      toast.success("Variable removed");
    },
  });
}

export function useUpsertCallVariableGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await supabase.from("five9_call_variable_groups").update(row).eq("id", row.id).select().single()
        : await supabase.from("five9_call_variable_groups").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["five9-var-groups"] });
      toast.success("Group saved");
    },
  });
}

// ── Event Log ──────────────────────────────────────────────────────
export interface Five9EventLogFilters {
  client_id?: string;
  status?: string;
  limit?: number;
}

export function useFive9EventLog(filters?: Five9EventLogFilters) {
  return useQuery({
    queryKey: ["five9-event-log", filters],
    queryFn: async () => {
      let q = supabase.from("five9_event_log").select("*").order("created_at", { ascending: false });
      if (filters?.client_id) q = q.eq("resolved_client_id", filters.client_id);
      if (filters?.status) q = q.eq("status", filters.status);
      q = q.limit(filters?.limit ?? 100);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Test/Simulation ────────────────────────────────────────────────
export function useRunFive9Simulation() {
  return useMutation({
    mutationFn: async (input: {
      raw_payload: Record<string, unknown>;
      target_client_id?: string;
      target_provider?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("five9-overlay-test", { body: input });
      if (error) throw error;
      return data;
    },
  });
}

// ── Health derived view ────────────────────────────────────────────
export function useFive9Health(clientId?: string) {
  return useQuery({
    queryKey: ["five9-health", clientId],
    queryFn: async () => {
      let q = supabase.from("five9_event_log").select("status, created_at, error").order("created_at", { ascending: false }).limit(500);
      if (clientId) q = q.eq("resolved_client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      const events = data ?? [];
      const last24h = events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 86400000);
      return {
        last_event_at: events[0]?.created_at ?? null,
        total_24h: last24h.length,
        failed_24h: last24h.filter((e) => e.status === "failed").length,
        review_queued_24h: last24h.filter((e) => e.status === "review_queued").length,
        completed_24h: last24h.filter((e) => e.status === "completed").length,
        unresolved_24h: last24h.filter((e) => e.status === "received" || e.status === "normalized").length,
        recent_errors: events
          .filter((e) => e.error)
          .slice(0, 5)
          .map((e) => e.error as string),
      };
    },
  });
}
