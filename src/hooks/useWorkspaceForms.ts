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

// ============================================================
// Phase C — FormSchemaV1 hooks
// ============================================================
import { migrateLegacyFormSchema, formSchemaV1Zod } from "@/lib/forms/schema-zod";
import type { FormSchemaV1 } from "@/types/form-schema";

/** Loads a form's schema, migrates legacy shapes, returns FormSchemaV1. */
export function useFormSchema(formId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["form-schema-v1", workspace?.id ?? null, formId ?? null],
    enabled: !!workspace && !!formId,
    queryFn: async (): Promise<FormSchemaV1> => {
      const { data, error } = await supabase
        .from("forms")
        .select("schema")
        .eq("id", formId!)
        .eq("workspace_id", workspace!.id)
        .maybeSingle();
      if (error) throw error;
      return migrateLegacyFormSchema(data?.schema);
    },
  });
}

/** Persists a FormSchemaV1 into forms.schema. Validates first. */
export function useUpdateFormSchema(formId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schema: FormSchemaV1) => {
      if (!formId) throw new Error("No form id");
      const parsed = formSchemaV1Zod.safeParse(schema);
      if (!parsed.success) {
        throw new Error(`Invalid form schema: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      }
      const { error } = await supabase
        .from("forms")
        .update({ schema: parsed.data as unknown as never })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-schema-v1"] });
      qc.invalidateQueries({ queryKey: ["workspace-form"] });
      qc.invalidateQueries({ queryKey: ["workspace-forms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Lists every persisted form_versions row, newest first. */
export function useFormVersionsV1(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-versions-v1", formId ?? null],
    enabled: !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_versions")
        .select("id, form_id, version, schema, is_current, notes, created_by, created_at")
        .eq("form_id", formId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Publishes the current draft schema as a new immutable version.
 * Marks all prior versions as not-current and bumps forms.current_version.
 */
export function usePublishForm(formId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { schema: FormSchemaV1; notes?: string }) => {
      if (!formId) throw new Error("No form id");
      const parsed = formSchemaV1Zod.safeParse(input.schema);
      if (!parsed.success) {
        throw new Error(`Invalid form schema: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      }
      const { data: latest } = await supabase
        .from("form_versions")
        .select("version")
        .eq("form_id", formId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (latest?.version ?? 0) + 1;
      await supabase.from("form_versions").update({ is_current: false }).eq("form_id", formId);
      const { error: vErr } = await supabase.from("form_versions").insert([{
        form_id: formId,
        version: next,
        schema: parsed.data as unknown as never,
        is_current: true,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      }] as never);
      if (vErr) throw vErr;
      const { error: fErr } = await supabase
        .from("forms")
        .update({
          schema: parsed.data as unknown as never,
          current_version: next,
          status: "published",
        } as never)
        .eq("id", formId);
      if (fErr) throw fErr;
      return { version: next };
    },
    onSuccess: ({ version }) => {
      qc.invalidateQueries({ queryKey: ["form-versions-v1", formId] });
      qc.invalidateQueries({ queryKey: ["workspace-form"] });
      qc.invalidateQueries({ queryKey: ["workspace-forms"] });
      toast.success(`Published v${version}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Clones a form (row + current schema) into a new draft. */
export function useDuplicateForm() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sourceFormId: string): Promise<WorkspaceForm> => {
      if (!workspace) throw new Error("No workspace");
      const { data: src, error: srcErr } = await supabase
        .from("forms")
        .select("name, description, schema")
        .eq("id", sourceFormId)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (srcErr) throw srcErr;
      if (!src) throw new Error("Source form not found");
      const migrated = migrateLegacyFormSchema(src.schema);
      const { data: created, error } = await supabase
        .from("forms")
        .insert({
          workspace_id: workspace.id,
          name: `${src.name} (copy)`,
          description: src.description,
          schema: migrated as unknown as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return created as WorkspaceForm;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-forms"] });
      toast.success("Form duplicated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
