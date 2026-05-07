import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DigestCohort = "all" | "design_partners" | "ops";
export type DigestCadence = "weekly" | "daily";

export interface DigestSubscription {
  id: string;
  organization_id: string;
  recipient_email: string;
  recipient_name: string | null;
  cohort: DigestCohort;
  cadence: DigestCadence;
  enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export interface DigestRun {
  id: string;
  organization_id: string;
  cohort: string;
  cadence: string;
  window_start: string;
  window_end: string;
  recipients_count: number;
  delivery_status: string;
  summary: any;
  created_at: string;
}

export interface DigestDelta {
  current: number;
  previous: number;
  delta: number;
  pct: number;
}

export interface DigestSummary {
  window: string;
  window_start: string;
  window_end: string;
  previous_window_start: string;
  previous_window_end: string;
  deltas: {
    total_jobs: DigestDelta;
    success_rate: { current: number | null; previous: number | null };
    failed_jobs: DigestDelta;
    rate_limited: DigestDelta;
    open_alerts: DigestDelta;
    recurring_issues: DigestDelta;
    ga_done: DigestDelta;
  };
  totals: {
    tenants: number;
    design_partners: number;
    jobs: number;
    succeeded: number;
    failed: number;
    open_alerts: number;
    recurring: number;
  };
  top_failing_tenants: Array<{ name: string; failed: number; total: number }>;
  top_failing_actions: Array<{ provider: string; action: string; failed: number; total: number }>;
  release_notes: Array<{ id: string; title: string; audience: string; published_at: string }>;
}

const QK_SUBS = (org?: string | null) => ["lc-digest-subs", org];
const QK_RUNS = (org?: string | null) => ["lc-digest-runs", org];
const QK_PREVIEW = (org?: string | null, w?: string) => ["lc-digest-preview", org, w];

export function useDigestSubscriptions(orgId: string | undefined | null) {
  return useQuery({
    queryKey: QK_SUBS(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<DigestSubscription[]> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_digest_subscriptions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DigestSubscription[];
    },
  });
}

export function useUpsertDigestSubscription(orgId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      recipient_email: string;
      recipient_name?: string;
      cohort: DigestCohort;
      cadence: DigestCadence;
      enabled?: boolean;
    }) => {
      if (!orgId) throw new Error("organization required");
      const payload: any = {
        organization_id: orgId,
        recipient_email: input.recipient_email.trim().toLowerCase(),
        recipient_name: input.recipient_name ?? null,
        cohort: input.cohort,
        cadence: input.cadence,
        enabled: input.enabled ?? true,
      };
      const { error } = await (supabase as any)
        .from("legal_connect_digest_subscriptions")
        .upsert(payload, { onConflict: "organization_id,recipient_email,cadence" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_SUBS(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDigestSubscription(orgId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("legal_connect_digest_subscriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_SUBS(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDigestRuns(orgId: string | undefined | null) {
  return useQuery({
    queryKey: QK_RUNS(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<DigestRun[]> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_digest_runs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as DigestRun[];
    },
  });
}

export function useDigestPreview(orgId: string | undefined | null, window: "24h" | "7d" | "30d" = "7d") {
  return useQuery<DigestSummary>({
    queryKey: QK_PREVIEW(orgId, window),
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `legal-connect-digest?organization_id=${orgId}&window=${window}`,
        { method: "GET" },
      );
      if (error) throw error;
      return data as DigestSummary;
    },
  });
}

export function useSendDigest(orgId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cadence: DigestCadence; cohort: DigestCohort; dry_run?: boolean; tenant_id?: string | null }) => {
      const { data, error } = await supabase.functions.invoke(
        `legal-connect-digest?organization_id=${orgId}`,
        { method: "POST", body: { action: "send", ...input } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Digest recorded · ${d?.recipients_count ?? 0} recipient(s)`);
      qc.invalidateQueries({ queryKey: QK_RUNS(orgId) });
      qc.invalidateQueries({ queryKey: QK_SUBS(orgId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
