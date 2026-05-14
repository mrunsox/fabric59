import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type WorkspaceForm = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  current_version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useWorkspaceForms() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-forms", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceForm[]> => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, workspace_id, name, description, status, schema, metadata, current_version, created_by, created_at, updated_at")
        .eq("workspace_id", workspace!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceForm[];
    },
  });
}

export function useWorkspaceForm(formId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-form", workspace?.id ?? null, formId ?? null],
    enabled: !!workspace && !!formId,
    queryFn: async (): Promise<WorkspaceForm | null> => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, workspace_id, name, description, status, schema, metadata, current_version, created_by, created_at, updated_at")
        .eq("id", formId!)
        .eq("workspace_id", workspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspaceForm | null) ?? null;
    },
  });
}

export function useCreateWorkspaceForm() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!workspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("forms")
        .insert({
          workspace_id: workspace.id,
          name: input.name,
          description: input.description ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkspaceForm;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-forms"] });
      toast.success("Form created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
