import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Eye, Users, Phone, Signal, Award, Gauge, Route, Target,
  Activity, BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useScriptSessions } from "@/hooks/useScriptSessions";
import { useCampaignScripts } from "@/hooks/useCampaignScripts";
import { usePerformanceGoals } from "@/hooks/usePerformanceGoals";
import { useScripts } from "@/hooks/useScripts";
import { useTenants } from "@/hooks/useTenants";

// Analytics components
import { LiveMonitoringPanel } from "@/components/analytics/LiveMonitoringPanel";
import { CallSessionAnalytics } from "@/components/analytics/CallSessionAnalytics";
import { OutcomeAnalyticsDashboard } from "@/components/analytics/OutcomeAnalyticsDashboard";
import { PathAnalyticsDashboard } from "@/components/analytics/PathAnalyticsDashboard";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--warning))"];
const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

type AgentRow = { id: string; first_name: string; last_name: string; role: string; status: string };

export default function SupervisorPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const { data: sessions = [] } = useScriptSessions(100);
  const { data: routes = [] } = useCampaignScripts();
  const { data: goals = [] } = usePerformanceGoals("active");
  const { data: scripts = [] } = useScripts();
  const { data: tenants = [] } = useTenants();

  useEffect(() => {
    supabase.from("agents").select("*").eq("status", "active").then(({ data }) => {
      if (data) setAgents(data as AgentRow[]);
    });
  }, []);

  const dispStats = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => { if (s.disposition) counts[s.disposition] = (counts[s.disposition] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [sessions]);

  const agentStats = useMemo(() => {
    return agents.map(a => {
      const agentSessions = sessions.filter(s => s.agent_id === a.id);
      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = agentSessions.filter(s => s.started_at.slice(0, 10) === today);
      const avgHandle = todaySessions.length > 0
        ? Math.round(todaySessions.reduce((s, c) => s + (c.duration_seconds || 0), 0) / todaySessions.length) : 0;
      return { ...a, callsToday: todaySessions.length, avgHandle };
    });
  }, [agents, sessions]);

  const leaderboard = [...agentStats].filter(a => a.callsToday > 0).sort((a, b) => b.callsToday - a.callsToday);
  const scriptName = (id: string) => scripts.find(s => s.id === id)?.name || "—";
  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="h-6 w-6" /> Supervisor Console</h1>
          <p className="text-sm text-muted-foreground">Agent monitoring, routing, and session analytics</p>
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="agents">Agent Board</TabsTrigger>
          <TabsTrigger value="live-monitor"><Activity className="h-3 w-3 mr-1" /> Live Monitor</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3 w-3 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="routing">Scripts & Routing</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active agents found.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {agentStats.map(agent => (
                <Card key={agent.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
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

        <TabsContent value="live-monitor" className="space-y-4">
          <LiveMonitoringPanel />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <CallSessionAnalytics />
          <OutcomeAnalyticsDashboard />
          <PathAnalyticsDashboard />
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

        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4" /> Active Script Routing</CardTitle></CardHeader>
            <CardContent>
              {routes.length === 0 ? <p className="text-sm text-muted-foreground">No script routing configured.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>DNIS</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Script</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.filter(r => r.is_active).slice(0, 10).map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{tenantName(r.tenant_id)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.dnis || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.five9_campaign_id || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{scriptName(r.script_id)}</Badge></TableCell>
                        <TableCell><Badge variant="default">Active</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          {goals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active goals. Go to Goals & Coaching to create targets.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.slice(0, 6).map(goal => (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{goal.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span className="capitalize">{goal.metric}</span>
                      <span className="font-mono">0 / {goal.target_value}</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
