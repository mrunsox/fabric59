import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { FormSchema } from "@/types/form-builder";

export type FormVersion = {
  id: string;
  form_id: string;
  version: number;
  schema: FormSchema;
  is_current: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type FormSubmission = {
  id: string;
  workspace_id: string;
  form_id: string;
  form_version: number;
  campaign_id: string | null;
  source: string;
  payload: Record<string, unknown>;
  mapped: Record<string, unknown>;
  submitted_by: string | null;
  submitted_at: string;
};

export type FormCampaignAssignment = {
  id: string;
  form_id: string;
  campaign_id: string;
  workspace_id: string;
  created_at: string;
};

export function useFormVersions(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-versions", formId ?? null],
    enabled: !!formId,
    queryFn: async (): Promise<FormVersion[]> => {
      const { data, error } = await supabase
        .from("form_versions")
        .select("*")
        .eq("form_id", formId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormVersion[];
    },
  });
}

export function useSaveFormSchema() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { formId: string; schema: FormSchema; publish?: boolean; notes?: string }) => {
      const { formId, schema, publish, notes } = input;
      // Update the working schema on forms.
      const updatePayload: Record<string, unknown> = { schema: schema as unknown as never };
      if (publish) updatePayload.status = "published";
      const { data: formRow, error: e1 } = await supabase
        .from("forms")
        .update(updatePayload as never)
        .eq("id", formId)
        .select("id, current_version, status")
        .single();
      if (e1) throw e1;

      if (publish) {
        // Determine the next version number based on existing versions.
        const { data: latest } = await supabase
          .from("form_versions")
          .select("version")
          .eq("form_id", formId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        const targetVersion = (latest?.version ?? 0) + 1;
        await supabase.from("form_versions").update({ is_current: false }).eq("form_id", formId);
        const { error: vErr } = await supabase.from("form_versions").insert([{
          form_id: formId,
          version: targetVersion,
          schema: schema as unknown as never,
          is_current: true,
          notes: notes ?? null,
          created_by: user?.id ?? null,
        }] as never);
        if (vErr) throw vErr;
        await supabase.from("forms").update({ current_version: targetVersion } as never).eq("id", formId);
      }
      void formRow;
      return { ok: true };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-form"] });
      qc.invalidateQueries({ queryKey: ["form-versions", vars.formId] });
      toast.success(vars.publish ? "Form published" : "Draft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-submissions", formId ?? null],
    enabled: !!formId,
    queryFn: async (): Promise<FormSubmission[]> => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId!)
        .order("submitted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as FormSubmission[];
    },
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      formId: string;
      version: number;
      payload: Record<string, unknown>;
      mapped: Record<string, unknown>;
      source?: string;
      campaignId?: string | null;
    }) => {
      if (!workspace) throw new Error("No workspace");
      const { error } = await supabase.from("form_submissions").insert([{
        workspace_id: workspace.id,
        form_id: input.formId,
        form_version: input.version,
        campaign_id: input.campaignId ?? null,
        source: input.source ?? "preview",
        payload: input.payload as never,
        mapped: input.mapped as never,
        submitted_by: user?.id ?? null,
      }] as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["form-submissions", vars.formId] });
      toast.success("Submission recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFormCampaignAssignments(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-campaign-assignments", formId ?? null],
    enabled: !!formId,
    queryFn: async (): Promise<FormCampaignAssignment[]> => {
      const { data, error } = await supabase
        .from("form_campaign_assignments")
        .select("*")
        .eq("form_id", formId!);
      if (error) throw error;
      return (data ?? []) as unknown as FormCampaignAssignment[];
    },
  });
}

export function useAssignFormToCampaign() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { formId: string; campaignId: string }) => {
      if (!workspace) throw new Error("No workspace");
      const { error } = await supabase.from("form_campaign_assignments").insert({
        workspace_id: workspace.id,
        form_id: input.formId,
        campaign_id: input.campaignId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["form-campaign-assignments", vars.formId] });
      toast.success("Form assigned to campaign");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnassignFormFromCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assignmentId: string; formId: string }) => {
      const { error } = await supabase.from("form_campaign_assignments").delete().eq("id", input.assignmentId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["form-campaign-assignments", vars.formId] });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
