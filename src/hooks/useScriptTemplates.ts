import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useScriptTemplates(category?: string) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["script-templates", orgId, category],
    queryFn: async () => {
      if (!orgId) return [];
      let q = supabase
        .from("script_templates")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateScriptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      name: string;
      description?: string;
      content: Record<string, unknown>;
      category?: string;
      tenant_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("script_templates")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script-templates"] });
      toast.success("Template saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteScriptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("script_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script-templates"] });
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
