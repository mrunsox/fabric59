import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useTrainingModules() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["training_modules", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useTrainingLessons(moduleId?: string) {
  return useQuery({
    queryKey: ["training_lessons", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data, error } = await supabase
        .from("training_lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

export function useTrainingProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training_progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useCreateTrainingModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; description?: string; organization_id: string; tenant_id?: string; status?: string }) => {
      const { data, error } = await supabase.from("training_modules").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_modules"] });
      toast.success("Training module created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateTrainingLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { module_id: string; title: string; content?: string; sort_order?: number; duration_minutes?: number }) => {
      const { data, error } = await supabase.from("training_lessons").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["training_lessons", vars.module_id] });
      toast.success("Lesson created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTrainingProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { user_id: string; lesson_id: string; module_id: string; status: string; score?: number }) => {
      const { data, error } = await supabase.from("training_progress").upsert(values, { onConflict: "user_id,lesson_id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
