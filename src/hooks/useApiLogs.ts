import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ApiLog, ApiLogStatus } from "@/types/database";

interface UseApiLogsOptions {
  tenantId?: string;
  status?: ApiLogStatus;
  limit?: number;
}

export function useApiLogs(options: UseApiLogsOptions = {}) {
  const { tenantId, status, limit = 100 } = options;

  return useQuery({
    queryKey: ["api-logs", tenantId, status, limit],
    queryFn: async (): Promise<ApiLog[]> => {
      let query = supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        endpoint: row.endpoint,
        method: row.method,
        request_payload: row.request_payload as Record<string, unknown> | null,
        response: row.response as Record<string, unknown> | null,
        status: row.status as ApiLogStatus,
        response_time_ms: row.response_time_ms,
        created_at: row.created_at,
      }));
    },
    refetchInterval: 5000, // Real-time feel
  });
}

export function useApiLogStats() {
  return useQuery({
    queryKey: ["api-log-stats"],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("api_logs")
        .select("status, created_at")
        .gte("created_at", oneDayAgo.toISOString());

      if (error) throw error;

      const logs = data || [];
      const total = logs.length;
      const success = logs.filter((l) => l.status === "success").length;
      const errors = logs.filter((l) => l.status === "error").length;

      return {
        total,
        success,
        errors,
        successRate: total > 0 ? Math.round((success / total) * 100) : 100,
      };
    },
    refetchInterval: 10000,
  });
}
