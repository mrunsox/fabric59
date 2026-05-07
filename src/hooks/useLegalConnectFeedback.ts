import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FeedbackEntry, ReleaseNote } from "@/data/legal-connect-feedback";

const QK_FEEDBACK = ["lc-feedback"] as const;
const QK_NOTES = ["lc-release-notes"] as const;

export function useLegalConnectFeedback(filters?: { clientId?: string | null; organizationId?: string | null }) {
  return useQuery({
    queryKey: [...QK_FEEDBACK, filters?.clientId ?? null, filters?.organizationId ?? null],
    queryFn: async (): Promise<FeedbackEntry[]> => {
      let q = (supabase as any)
        .from("legal_connect_feedback_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.clientId) q = q.eq("client_id", filters.clientId);
      if (filters?.organizationId) q = q.eq("organization_id", filters.organizationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeedbackEntry[];
    },
  });
}

export function useCreateFeedbackEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FeedbackEntry> & { organization_id: string; message: string }) => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_feedback_entries")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FeedbackEntry;
    },
    onSuccess: () => {
      toast.success("Feedback logged");
      qc.invalidateQueries({ queryKey: QK_FEEDBACK });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFeedbackEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FeedbackEntry> }) => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_feedback_entries")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as FeedbackEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_FEEDBACK });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReleaseNotes(audience?: "all" | "design_partners" | "internal") {
  return useQuery({
    queryKey: [...QK_NOTES, audience ?? "any"],
    queryFn: async (): Promise<ReleaseNote[]> => {
      let q = (supabase as any)
        .from("legal_connect_release_notes")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(50);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as ReleaseNote[];
      if (!audience || audience === "internal") return rows;
      // For design_partners: show "all" + "design_partners"
      // For all: only "all"
      return rows.filter((r) => r.audience === "all" || (audience === "design_partners" && r.audience === "design_partners"));
    },
  });
}
