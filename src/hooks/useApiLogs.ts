import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ApiLog, ApiLogStatus } from "@/types/database";

interface UseApiLogsOptions {
  tenantId?: string;
  status?: ApiLogStatus;
  limit?: number;
}

export function useApiLogs(options: UseApiLogsOptions = {}) {
  const { tenantId, status, limit = 100 } = options;
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);

  const query = useQuery({
    queryKey: ["api-logs", tenantId, status, limit],
    queryFn: async (): Promise<ApiLog[]> => {
      let q = supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tenantId) q = q.eq("tenant_id", tenantId);
      if (status) q = q.eq("status", status);

      const { data, error } = await q;
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
  });

  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel("api-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "api_logs" },
        (payload) => {
          const row = payload.new as any;
          const newLog: ApiLog = {
            id: row.id,
            tenant_id: row.tenant_id,
            endpoint: row.endpoint,
            method: row.method,
            request_payload: row.request_payload,
            response: row.response,
            status: row.status as ApiLogStatus,
            response_time_ms: row.response_time_ms,
            created_at: row.created_at,
          };

          queryClient.setQueryData<ApiLog[]>(
            ["api-logs", tenantId, status, limit],
            (old = []) => [newLog, ...old].slice(0, limit)
          );

          queryClient.invalidateQueries({ queryKey: ["api-log-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, tenantId, status, limit, queryClient]);

  const toggleLive = useCallback(() => setIsLive((prev) => !prev), []);

  return { ...query, isLive, toggleLive };
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
    refetchInterval: 30000,
  });
}
