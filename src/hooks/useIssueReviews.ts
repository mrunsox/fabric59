import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type IssueReviewStatus = "new" | "acknowledged" | "monitoring" | "resolved";

export interface IssueReview {
  id: string;
  organization_id: string;
  issue_key: string;
  status: IssueReviewStatus;
  note: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_from?: string | null;
  external_actor?: string | null;
  updated_at: string;
}

const QK = (org?: string | null) => ["lc-issue-reviews", org];

export function useIssueReviews(orgId: string | undefined | null) {
  return useQuery({
    queryKey: QK(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<Record<string, IssueReview>> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_issue_reviews")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      const map: Record<string, IssueReview> = {};
      for (const row of (data ?? []) as IssueReview[]) map[row.issue_key] = row;
      return map;
    },
  });
}

export function useUpsertIssueReview(orgId: string | undefined | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { issue_key: string; status?: IssueReviewStatus; note?: string | null }) => {
      if (!orgId) throw new Error("organization required");
      const { error } = await (supabase as any)
        .from("legal_connect_issue_reviews")
        .upsert(
          {
            organization_id: orgId,
            issue_key: patch.issue_key,
            status: patch.status ?? "acknowledged",
            note: patch.note ?? null,
            updated_by: user?.id ?? null,
            updated_by_name: user?.email ?? null,
            updated_from: "app",
            external_actor: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,issue_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}
