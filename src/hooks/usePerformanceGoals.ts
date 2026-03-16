import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePerformanceGoals(statusFilter?: string) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["performance_goals", organization?.id, statusFilter],
    queryFn: async () => {
      if (!organization?.id) return [];
      let q = supabase
        .from("performance_goals")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useCreatePerformanceGoal() {
  const qc = useQueryClient();
  const { organization, user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      metric: string;
      target_value: number;
      timeframe?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      partner_id?: string;
      tenant_id?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("performance_goals")
        .insert({ ...input, organization_id: organization.id, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_goals"] });
      toast.success("Goal created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePerformanceGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; name?: string; target_value?: number; description?: string }) => {
      const { error } = await supabase.from("performance_goals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_goals"] });
      toast.success("Goal updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePerformanceGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("performance_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_goals"] });
      toast.success("Goal deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
