import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Workspace-scoped client list (Phase 2B).
 *
 * Until tenants/clients have a workspace_id column (deferred to a later slice),
 * we resolve clients via the workspace's parent organization_id. Once clients
 * gain workspace ownership, this hook is the single point that needs to switch
 * its predicate to .eq("workspace_id", workspace.id).
 */
export function useWorkspaceClients() {
  const { workspace, organizationId } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-clients", workspace?.id ?? null],
    enabled: !!workspace && !!organizationId,
    queryFn: async () => {
      // TRANSITIONAL: org-scoped read. Swap to workspace_id filter once clients table gains it.
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, status, created_at")
        .eq("organization_id", organizationId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
