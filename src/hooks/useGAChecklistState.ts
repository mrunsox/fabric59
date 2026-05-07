import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type GAChecklistItemState = {
  id: string;
  tenant_id: string;
  organization_id: string;
  item_id: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  note: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string;
};

const QK = (tenantId: string) => ["lc-ga-checklist", tenantId];

export function useGAChecklistState(tenantId: string | undefined) {
  return useQuery({
    queryKey: QK(tenantId ?? ""),
    enabled: !!tenantId,
    queryFn: async (): Promise<Record<string, GAChecklistItemState>> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_ga_checklist_state")
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: Record<string, GAChecklistItemState> = {};
      for (const row of (data ?? []) as GAChecklistItemState[]) map[row.item_id] = row;
      return map;
    },
  });
}

export function useUpsertGAChecklistItem(tenantId: string | undefined, organizationId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { item_id: string; status?: string; note?: string | null }) => {
      if (!tenantId || !organizationId) throw new Error("tenant + org required");
      const { error } = await (supabase as any)
        .from("legal_connect_ga_checklist_state")
        .upsert(
          {
            tenant_id: tenantId,
            organization_id: organizationId,
            item_id: patch.item_id,
            status: patch.status ?? "todo",
            note: patch.note ?? null,
            updated_by: user?.id ?? null,
            updated_by_name: user?.email ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,item_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(tenantId ?? "") }),
    onError: (e: Error) => toast.error(e.message),
  });
}
