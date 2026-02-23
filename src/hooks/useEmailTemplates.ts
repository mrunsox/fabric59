import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  html_content: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates(orgId?: string) {
  return useQuery({
    queryKey: ["email_templates", orgId],
    queryFn: async (): Promise<EmailTemplate[]> => {
      let query = supabase
        .from("email_templates" as any)
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EmailTemplate[];
    },
    enabled: !!orgId,
  });
}

export function useAllEmailTemplates() {
  return useQuery({
    queryKey: ["email_templates", "all"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as EmailTemplate[];
    },
  });
}

export function useSaveEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      id?: string;
      organization_id: string;
      name: string;
      html_content: string;
      is_default?: boolean;
      created_by?: string;
    }) => {
      if (template.id) {
        const { error } = await supabase
          .from("email_templates" as any)
          .update({
            name: template.name,
            html_content: template.html_content,
            is_default: template.is_default ?? false,
          } as any)
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates" as any)
          .insert({
            organization_id: template.organization_id,
            name: template.name,
            html_content: template.html_content,
            is_default: template.is_default ?? false,
            created_by: template.created_by,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      toast.success("Email template saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      toast.success("Email template deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
