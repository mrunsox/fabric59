import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TenantHealth {
  client_id: string;
  client_name: string;
  rollout_status: string;
  readiness_state: string;
  limits: { max_jobs_per_minute: number; max_jobs_per_hour: number };
  jobs_24h: number;
  jobs_7d: number;
  succeeded_24h: number;
  failed_24h: number;
  rate_limited_24h: number;
  test_24h: number;
  success_rate_24h: number | null;
  top_error_class: { kind: string; count: number } | null;
  open_alerts: number;
  last_job_at: string | null;
}

export interface LegalConnectAlert {
  id: string;
  client_id: string;
  alert_kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  details: any;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
}

const QK = (orgId?: string | null) => ["legal-connect-health", orgId];

export function useLegalConnectHealth(orgId: string | undefined | null) {
  return useQuery({
    queryKey: QK(orgId),
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<{ health: TenantHealth[]; alerts: LegalConnectAlert[] }> => {
      const { data, error } = await supabase.functions.invoke(
        `legal-connect-health?organization_id=${orgId}`,
        { method: "GET" },
      );
      if (error) throw error;
      return data as any;
    },
  });
}

export function useEvaluateAlerts(orgId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `legal-connect-health?organization_id=${orgId}`,
        { method: "POST", body: { action: "evaluate" } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Evaluated alerts (${d?.created ?? 0} new)`);
      qc.invalidateQueries({ queryKey: QK(orgId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAckAlert(orgId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alert_id, resolve }: { alert_id: string; resolve?: boolean }) => {
      const { error } = await supabase.functions.invoke(
        `legal-connect-health?organization_id=${orgId}`,
        { method: "POST", body: { action: resolve ? "resolve" : "ack", alert_id } },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}
