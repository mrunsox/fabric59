import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Notification, NotificationChannel, NotificationStatus, NotificationTrigger } from "@/types/database";

export function useNotifications(tenantId?: string) {
  return useQuery({
    queryKey: ["notifications", tenantId],
    queryFn: async (): Promise<Notification[]> => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        channel: row.channel as NotificationChannel,
        recipient: row.recipient,
        payload: (row.payload || {}) as Record<string, unknown>,
        status: row.status as NotificationStatus,
        response: row.response as Record<string, unknown> | null,
        trigger_event: row.trigger_event as NotificationTrigger,
        created_at: row.created_at,
      }));
    },
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ["notification-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("status, created_at");

      if (error) throw error;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = {
        total: data?.length || 0,
        sent: data?.filter((n) => n.status === "sent").length || 0,
        failed: data?.filter((n) => n.status === "failed").length || 0,
        last24h: data?.filter((n) => new Date(n.created_at) >= last24h).length || 0,
      };

      return stats;
    },
  });
}
