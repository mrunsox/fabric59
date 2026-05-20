import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Form submissions hooks (Checkpoint 4).
 *
 * Reads recent submissions for a form and lets the Agent Cockpit persist a
 * new submission tagged `source="agent_cockpit"` with outcome/disposition
 * metadata. The narrow `form_submissions` columns added by the Checkpoint 4
 * migration (outcome_key, disposition_key, notes, metadata) are written
 * alongside the existing payload/mapped/source/campaign_id fields.
 */

export type FormSubmissionRow = {
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
  outcome_key: string | null;
  disposition_key: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
};

export function useFormSubmissions(formId: string | undefined, opts?: { limit?: number }) {
  const { workspace } = useWorkspace();
  const limit = opts?.limit ?? 25;
  return useQuery({
    queryKey: ["form-submissions", workspace?.id ?? null, formId ?? null, limit],
    enabled: !!workspace && !!formId,
    queryFn: async (): Promise<FormSubmissionRow[]> => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select(
          "id, workspace_id, form_id, form_version, campaign_id, source, payload, mapped, submitted_by, submitted_at, outcome_key, disposition_key, notes, metadata",
        )
        .eq("workspace_id", workspace!.id)
        .eq("form_id", formId!)
        .order("submitted_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as FormSubmissionRow[];
    },
  });
}

export type CreateFormSubmissionInput = {
  formId: string;
  formVersion: number;
  campaignId?: string | null;
  source?: string;
  payload: Record<string, unknown>;
  mapped?: Record<string, unknown>;
  outcomeKey?: string | null;
  dispositionKey?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export function useCreateFormSubmission() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateFormSubmissionInput) => {
      if (!workspace) throw new Error("No workspace");
      const metadata = {
        ...(input.metadata ?? {}),
        outcomeKey: input.outcomeKey ?? null,
        dispositionKey: input.dispositionKey ?? null,
        notes: input.notes ?? null,
      };
      const { data, error } = await supabase
        .from("form_submissions")
        .insert({
          workspace_id: workspace.id,
          form_id: input.formId,
          form_version: input.formVersion,
          campaign_id: input.campaignId ?? null,
          source: input.source ?? "agent_cockpit",
          payload: input.payload,
          mapped: input.mapped ?? {},
          submitted_by: user?.id ?? null,
          outcome_key: input.outcomeKey ?? null,
          disposition_key: input.dispositionKey ?? null,
          notes: input.notes ?? null,
          metadata,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FormSubmissionRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["form-submissions"] });
      qc.invalidateQueries({ queryKey: ["form-submissions", row.workspace_id, row.form_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
