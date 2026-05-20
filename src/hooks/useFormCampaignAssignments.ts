import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Form ↔ Campaign assignment hooks.
 *
 * The schema is the existing `form_campaign_assignments` table
 * (workspace_id, form_id, campaign_id) with a UNIQUE (form_id, campaign_id).
 *
 * Active-form rule (single-active per campaign):
 * Each campaign may be attached to at most ONE form at a time. We enforce
 * this in `useCampaignIntakeForm.setActive(formId)` by deleting any other
 * assignments for the campaign before inserting the new one. Detaching the
 * active form simply removes the row.
 *
 * Reads (`useFormCampaignAssignments(formId)`) return the campaigns currently
 * attached to a given form, so the Form detail page can render an assignments
 * panel without needing a separate state column.
 */

export type AssignmentRow = {
  id: string;
  workspace_id: string;
  form_id: string;
  campaign_id: string;
};

export function useFormCampaignAssignments(formId: string | undefined) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["form-campaign-assignments", workspace?.id ?? null, formId ?? null],
    enabled: !!workspace && !!formId,
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data, error } = await supabase
        .from("form_campaign_assignments")
        .select("id, workspace_id, form_id, campaign_id")
        .eq("workspace_id", workspace!.id)
        .eq("form_id", formId!);
      if (error) throw error;
      return (data ?? []) as AssignmentRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["form-campaign-assignments"] });
    qc.invalidateQueries({ queryKey: ["campaign-intake-form"] });
  };

  const attachCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!workspace || !formId) throw new Error("Missing context");
      // Enforce single-active: clear any other form on this campaign first.
      await supabase
        .from("form_campaign_assignments")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("campaign_id", campaignId);
      const { error } = await supabase.from("form_campaign_assignments").insert({
        workspace_id: workspace.id,
        form_id: formId,
        campaign_id: campaignId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Campaign attached");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detachCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!workspace || !formId) throw new Error("Missing context");
      const { error } = await supabase
        .from("form_campaign_assignments")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("form_id", formId)
        .eq("campaign_id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Campaign detached");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    ...query,
    attachCampaign: (id: string) => attachCampaign.mutateAsync(id),
    detachCampaign: (id: string) => detachCampaign.mutateAsync(id),
    isMutating: attachCampaign.isPending || detachCampaign.isPending,
  };
}

/**
 * Active intake form per campaign. Reads the (at most one) assignment row
 * for the campaign and exposes a `setActive(formId | null)` mutation that
 * preserves the single-active invariant.
 */
export function useCampaignIntakeForm(campaignId: string | undefined) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["campaign-intake-form", workspace?.id ?? null, campaignId ?? null],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<AssignmentRow | null> => {
      const { data, error } = await supabase
        .from("form_campaign_assignments")
        .select("id, workspace_id, form_id, campaign_id")
        .eq("workspace_id", workspace!.id)
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AssignmentRow | null) ?? null;
    },
  });

  const setActive = useMutation({
    mutationFn: async (formId: string | null) => {
      if (!workspace || !campaignId) throw new Error("Missing context");
      // Always clear existing rows first to enforce single-active.
      const { error: delErr } = await supabase
        .from("form_campaign_assignments")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("campaign_id", campaignId);
      if (delErr) throw delErr;
      if (!formId) return;
      const { error } = await supabase.from("form_campaign_assignments").insert({
        workspace_id: workspace.id,
        form_id: formId,
        campaign_id: campaignId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-intake-form"] });
      qc.invalidateQueries({ queryKey: ["form-campaign-assignments"] });
      toast.success("Intake form updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    ...query,
    setActive: (formId: string | null) => setActive.mutateAsync(formId),
    isMutating: setActive.isPending,
  };
}
