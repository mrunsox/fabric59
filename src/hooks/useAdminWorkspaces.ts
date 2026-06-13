import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Superadmin workspace CRUD + tenant reassignment hooks.
 *
 * All writes are RLS-gated to `master_admin` (or org owner/admin) — the UI
 * additionally hides these actions behind `isMasterAdmin` in AuthContext.
 */

function invalidateWorkspaceCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-workspaces-orgs"] });
  qc.invalidateQueries({ queryKey: ["admin-workspaces-default-map"] });
  qc.invalidateQueries({ queryKey: ["admin-workspaces-list"] });
  qc.invalidateQueries({ queryKey: ["admin-tenants-all"] });
  qc.invalidateQueries({ queryKey: ["workspaces"] });
  qc.invalidateQueries({ queryKey: ["tenants"] });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organizationId: string; name: string; isDefault?: boolean }) => {
      if (input.isDefault) {
        await supabase
          .from("workspaces")
          .update({ is_default: false } as never)
          .eq("organization_id", input.organizationId)
          .eq("is_default", true);
      }
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          organization_id: input.organizationId,
          name: input.name,
          is_default: !!input.isDefault,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateWorkspaceCaches(qc);
      toast.success("Workspace created");
    },
    onError: (e: Error) => toast.error(`Create failed: ${e.message}`),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      organizationId: string;
      name?: string;
      isDefault?: boolean;
    }) => {
      if (input.isDefault) {
        await supabase
          .from("workspaces")
          .update({ is_default: false } as never)
          .eq("organization_id", input.organizationId)
          .eq("is_default", true)
          .neq("id", input.workspaceId);
      }
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.isDefault !== undefined) updates.is_default = input.isDefault;
      const { error } = await supabase
        .from("workspaces")
        .update(updates as never)
        .eq("id", input.workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateWorkspaceCaches(qc);
      toast.success("Workspace updated");
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateWorkspaceCaches(qc);
      toast.success("Workspace deleted");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });
}

export function useMoveTenantsToWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenantIds: string[];
      destinationWorkspaceId: string;
      destinationOrganizationId: string;
    }) => {
      if (input.tenantIds.length === 0) return { moved: 0 };
      const { error } = await supabase
        .from("tenants")
        .update({
          workspace_id: input.destinationWorkspaceId,
          organization_id: input.destinationOrganizationId,
        } as never)
        .in("id", input.tenantIds);
      if (error) throw error;
      return { moved: input.tenantIds.length };
    },
    onSuccess: ({ moved }) => {
      invalidateWorkspaceCaches(qc);
      toast.success(`Moved ${moved} client${moved === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(`Move failed: ${e.message}`),
  });
}
