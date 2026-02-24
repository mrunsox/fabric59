import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface DispositionAccess {
  id: string;
  organization_id: string;
  disposition_name: string;
  created_by: string | null;
  created_at: string;
}

export function useDispositionAccessList(orgId?: string) {
  const { organization } = useAuth();
  const targetOrg = orgId || organization?.id;

  return useQuery({
    queryKey: ["disposition_access", targetOrg],
    queryFn: async () => {
      if (!targetOrg) return [];
      const { data, error } = await db
        .from("disposition_access")
        .select("*")
        .eq("organization_id", targetOrg);
      if (error) throw error;
      return data as DispositionAccess[];
    },
    enabled: !!targetOrg,
  });
}

export function useUpdateDispositionAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      organizationId,
      dispositions,
    }: {
      organizationId: string;
      dispositions: string[];
    }) => {
      // Delete all existing, then insert new
      await db.from("disposition_access").delete().eq("organization_id", organizationId);

      if (dispositions.length > 0) {
        const rows = dispositions.map((d) => ({
          organization_id: organizationId,
          disposition_name: d,
          created_by: user?.id || null,
        }));
        const { error } = await db.from("disposition_access").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposition_access"] });
      toast.success("Disposition access updated");
    },
    onError: (error) => {
      toast.error("Failed to update disposition access: " + error.message);
    },
  });
}
