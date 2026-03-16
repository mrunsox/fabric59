import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Clock, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActiveAgent {
  id: string;
  first_name: string;
  last_name: string;
  status: "on-call" | "idle" | "acw";
  currentDuration?: number;
  sessionId?: string;
}

interface LiveMonitoringPanelProps {
  className?: string;
}

export function LiveMonitoringPanel({ className }: LiveMonitoringPanelProps) {
  const { organization } = useAuth();
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!organization?.id) return;

    const fetchPresence = async () => {
      // Get active agents
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id, first_name, last_name, status")
        .eq("status", "active");

      // Get active script sessions (no ended_at = on-call)
      const { data: activeSessions } = await supabase
        .from("script_sessions")
        .select("id, agent_id, started_at")
        .eq("organization_id", organization.id)
        .is("ended_at", null);

      const sessionMap = new Map(
        (activeSessions || []).map(s => [s.agent_id, s])
      );

      const mapped: ActiveAgent[] = (agentRows || []).map(a => {
        const session = sessionMap.get(a.id);
        if (session) {
          const dur = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
          return { id: a.id, first_name: a.first_name, last_name: a.last_name, status: "on-call" as const, currentDuration: dur, sessionId: session.id };
        }
        return { id: a.id, first_name: a.first_name, last_name: a.last_name, status: "idle" as const };
      });

      setAgents(mapped);
      setLastRefresh(new Date());
    };

    fetchPresence();
    const iv = setInterval(fetchPresence, 10000);
    return () => clearInterval(iv);
  }, [organization?.id]);

  const statusCounts = useMemo(() => {
    const counts = { "on-call": 0, idle: 0, acw: 0 };
    agents.forEach(a => counts[a.status]++);
    return counts;
  }, [agents]);

  const statusIcon = (s: string) => {
    if (s === "on-call") return <Phone className="h-3 w-3" />;
    if (s === "acw") return <Clock className="h-3 w-3" />;
    return <Coffee className="h-3 w-3" />;
  };

  const statusColor = (s: string) => {
    if (s === "on-call") return "bg-success/10 text-success border-success/30";
    if (s === "acw") return "bg-warning/10 text-warning border-warning/30";
    return "bg-muted text-muted-foreground";
  };

  const formatDur = (s?: number) => {
    if (!s) return "";
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Live Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-success">{statusCounts["on-call"]}</p>
            <p className="text-xs text-muted-foreground">On Call</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-warning">{statusCounts.acw}</p>
            <p className="text-xs text-muted-foreground">ACW</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{statusCounts.idle}</p>
            <p className="text-xs text-muted-foreground">Idle</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`rounded-lg border px-3 py-2 ${statusColor(agent.status)}`}
            >
              <div className="flex items-center gap-1 mb-1">
                {statusIcon(agent.status)}
                <span className="text-xs font-medium truncate">{agent.first_name} {agent.last_name.charAt(0)}.</span>
              </div>
              {agent.currentDuration !== undefined && (
                <p className="text-xs font-mono">{formatDur(agent.currentDuration)}</p>
              )}
            </div>
          ))}
          {agents.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-4">No agents online.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
