/**
 * useCallbackReminders — Queries tasks with callback-like titles/descriptions
 * that are pending and have upcoming due dates.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCallbackReminders() {
  const { user, organization } = useAuth();

  return useQuery({
    queryKey: ["callback_reminders", organization?.id, user?.id],
    queryFn: async () => {
      if (!organization?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("assigned_to", user.id)
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(20);

      if (error) throw error;

      // Filter for callback-type tasks (title or description contains "callback")
      return (data || []).filter(t =>
        t.title?.toLowerCase().includes("callback") ||
        t.title?.toLowerCase().includes("call back") ||
        t.description?.toLowerCase().includes("callback")
      );
    },
    enabled: !!organization?.id && !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });
}
