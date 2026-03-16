import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useQAReviews() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["qa_reviews", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("qa_reviews")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateQAReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      organization_id: string;
      script_session_id?: string;
      agent_id?: string;
      reviewer_id?: string;
      scores?: Json;
      total_score?: number;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("qa_reviews").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa_reviews"] });
      toast.success("QA review created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateQAReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      scores?: Record<string, unknown>;
      total_score?: number;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("qa_reviews").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa_reviews"] });
      toast.success("QA review updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
