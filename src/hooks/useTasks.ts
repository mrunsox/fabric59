import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useTasks(filter?: { assigned_to?: string; status?: string }) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["tasks", orgId, filter],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (filter?.assigned_to) query = query.eq("assigned_to", filter.assigned_to);
      if (filter?.status) query = query.eq("status", filter.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      organization_id: string;
      title: string;
      description?: string;
      priority?: string;
      assigned_to?: string;
      tenant_id?: string;
      due_date?: string;
      script_session_id?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase.from("tasks").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; title?: string; priority?: string; assigned_to?: string }) => {
      const { data, error } = await supabase.from("tasks").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
