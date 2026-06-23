import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type QaReview = {
  id: string;
  organization_id: string;
  script_session_id: string | null;
  call_session_id: string | null;
  agent_id: string | null;
  reviewer_id: string | null;
  status: string;
  total_score: number | null;
  scores: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useWorkspaceQaReviews(opts?: { status?: string }) {
  const { workspace } = useWorkspace();
  const status = opts?.status;
  return useQuery({
    queryKey: ["workspace-qa-reviews", workspace?.organization_id ?? null, status ?? "all"],
    enabled: !!workspace,
    queryFn: async (): Promise<QaReview[]> => {
      let q = supabase
        .from("qa_reviews")
        .select("*")
        .eq("organization_id", workspace!.organization_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QaReview[];
    },
  });
}

export function useUpdateQaReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("qa_reviews")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-qa-reviews"] });
      toast.success("Review updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
