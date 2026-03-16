/**
 * useAgentPresence — Derives agent online/idle/on-call status
 * from active script_sessions (where ended_at IS NULL).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AgentPresence {
  agent_id: string;
  status: "on-call" | "idle";
  session_id?: string;
  started_at?: string;
}

export function useAgentPresence() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["agent_presence", organization?.id],
    queryFn: async (): Promise<AgentPresence[]> => {
      if (!organization?.id) return [];

      // Get all active agents
      const { data: agents } = await supabase
        .from("agents")
        .select("id")
        .eq("status", "active");

      // Get active sessions
      const { data: activeSessions } = await supabase
        .from("script_sessions")
        .select("id, agent_id, started_at")
        .eq("organization_id", organization.id)
        .is("ended_at", null);

      const sessionMap = new Map(
        (activeSessions || []).map(s => [s.agent_id, s])
      );

      return (agents || []).map(a => {
        const session = sessionMap.get(a.id);
        if (session) {
          return {
            agent_id: a.id,
            status: "on-call" as const,
            session_id: session.id,
            started_at: session.started_at,
          };
        }
        return { agent_id: a.id, status: "idle" as const };
      });
    },
    enabled: !!organization?.id,
    refetchInterval: 10000,
  });
}
