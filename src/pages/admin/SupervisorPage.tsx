import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Eye, Users, Phone, Signal, AlertTriangle, Award, Gauge
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useScriptSessions } from "@/hooks/useScriptSessions";

type AgentState = "available" | "on-call" | "acw" | "break" | "offline";

const stateColors: Record<AgentState, string> = {
  available: "bg-success",
  "on-call": "bg-primary",
  acw: "bg-warning",
  break: "bg-muted-foreground",
  offline: "bg-destructive",
};

const stateBadgeVariant: Record<AgentState, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  "on-call": "default",
  acw: "secondary",
  break: "outline",
  offline: "destructive",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--warning))"];
const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export default function SupervisorPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const { data: sessions = [] } = useScriptSessions(100);

  useEffect(() => {
    supabase.from("agents").select("*").eq("status", "active").then(({ data }) => {
      if (data) setAgents(data);
    });
  }, []);

  // Derive disposition stats from sessions
  const dispStats = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.disposition) counts[s.disposition] = (counts[s.disposition] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [sessions]);

  // Agents with session counts
  const agentStats = useMemo(() => {
    return agents.map(a => {
      const agentSessions = sessions.filter(s => s.agent_id === a.id);
      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = agentSessions.filter(s => s.started_at.slice(0, 10) === today);
      const avgHandle = todaySessions.length > 0
        ? Math.round(todaySessions.reduce((s, c) => s + (c.duration_seconds || 0), 0) / todaySessions.length)
        : 0;
      return {
        ...a,
        callsToday: todaySessions.length,
        avgHandle,
        state: "available" as AgentState, // Real-time state requires Five9 supervisor API
      };
    });
  }, [agents, sessions]);

  const leaderboard = [...agentStats].filter(a => a.callsToday > 0).sort((a, b) => b.callsToday - a.callsToday);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="h-6 w-6" /> Supervisor Console</h1>
          <p className="text-sm text-muted-foreground">Agent monitoring and session analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">Active Agents</span></div>
          <p className="text-2xl font-bold">{agents.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">Total Sessions</span></div>
          <p className="text-2xl font-bold text-primary">{sessions.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Signal className="h-4 w-4" /><span className="text-xs">Dispositions</span></div>
          <p className="text-2xl font-bold">{dispStats.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Gauge className="h-4 w-4" /><span className="text-xs">Completed</span></div>
          <p className="text-2xl font-bold">{sessions.filter(s => s.post_call_status === "completed").length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agent Board</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active agents found. Agent state requires Five9 supervisor API integration.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {agentStats.map(agent => (
                <Card key={agent.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${stateColors[agent.state]}`} />
                  <CardContent className="pt-5 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium truncate">{agent.first_name} {agent.last_name}</h4>
                      <Badge variant="outline" className="text-xs">{agent.role}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Calls today: {agent.callsToday}</p>
                      {agent.avgHandle > 0 && <p>Avg handle: {formatDuration(agent.avgHandle)}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dispositions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Disposition Breakdown</CardTitle></CardHeader>
              <CardContent>
                {dispStats.length === 0 ? <p className="text-sm text-muted-foreground">No disposition data yet.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={dispStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {dispStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Disposition Volume</CardTitle></CardHeader>
              <CardContent>
                {dispStats.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dispStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Agent Leaderboard</CardTitle></CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">No session data for rankings yet.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Avg Handle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((agent, i) => (
                      <TableRow key={agent.id}>
                        <TableCell>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</TableCell>
                        <TableCell className="font-medium">{agent.first_name} {agent.last_name}</TableCell>
                        <TableCell className="text-right font-mono">{agent.callsToday}</TableCell>
                        <TableCell className="text-right font-mono">{formatDuration(agent.avgHandle)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
