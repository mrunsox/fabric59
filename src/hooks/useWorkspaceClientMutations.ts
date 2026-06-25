import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { CrmType } from "@/types/database";

export type ClientFormValues = {
  name: string;
  crm_type: CrmType;
  status: "active" | "inactive";
};

export function useCreateWorkspaceClient() {
  const qc = useQueryClient();
  const { workspace, organizationId } = useWorkspace();
  return useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (!workspace || !organizationId) throw new Error("No workspace selected");
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          name: values.name.trim(),
          crm_type: values.crm_type,
          status: values.status,
          organization_id: organizationId,
          workspace_id: workspace.id,
        })
        .select("id, name, status")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-clients"] });
      toast.success("Client created");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to create client"),
  });
}

export function useUpdateWorkspaceClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClientFormValues }) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: values.name.trim(),
          crm_type: values.crm_type,
          status: values.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-clients"] });
      qc.invalidateQueries({ queryKey: ["workspace-client"] });
      toast.success("Client updated");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to update client"),
  });
}

export function useDeleteWorkspaceClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Block delete if linked to campaigns
      const { count, error: countErr } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Client is linked to ${count} campaign${count === 1 ? "" : "s"}. Unlink them first.`,
        );
      }
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-clients"] });
      toast.success("Client deleted");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to delete client"),
  });
}
