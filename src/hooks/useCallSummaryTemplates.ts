import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCallSummaryTemplates() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["call_summary_templates", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("call_summary_templates")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCallSummaryTemplate() {
  const qc = useQueryClient();
  const { organization, user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      template_body: string;
      channel?: string;
      partner_id?: string;
      tenant_id?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("call_summary_templates")
        .insert({ ...input, organization_id: organization.id, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_summary_templates"] });
      toast.success("Template created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCallSummaryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; template_body?: string; channel?: string }) => {
      const { error } = await supabase.from("call_summary_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_summary_templates"] });
      toast.success("Template updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCallSummaryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_summary_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_summary_templates"] });
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
