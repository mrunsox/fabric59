import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Workspace-scoped client list (canonical).
 *
 * Strict: only returns tenants explicitly assigned to this workspace via
 * tenants.workspace_id. A fresh workspace shows empty state until clients are
 * assigned. Org-wide client roster lives at /admin/clients.
 */
export function useWorkspaceClients() {
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-clients", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, status, created_at")
        .eq("workspace_id", workspace!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
