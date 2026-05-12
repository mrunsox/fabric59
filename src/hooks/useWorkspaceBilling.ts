import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type Invoice = {
  id: string;
  organization_id: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
};

export function useWorkspaceInvoices(limit = 25) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-invoices", workspace?.organization_id ?? null, limit],
    enabled: !!workspace,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, organization_id, status, issue_date, due_date, currency, total_amount, notes, created_at")
        .eq("organization_id", workspace!.organization_id)
        .order("issue_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
}
