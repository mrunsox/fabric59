import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, Users, Phone, Timer, Signal, TrendingUp, Award,
  AlertTriangle, BarChart3, Activity, Gauge, MonitorCheck
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type AgentState = "available" | "on-call" | "acw" | "break" | "offline";

interface LiveAgent {
  name: string;
  state: AgentState;
  campaign: string;
  duration: number;
  callsToday: number;
  avgHandle: number;
}

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

const MOCK_AGENTS: LiveAgent[] = [
  { name: "Alice Johnson", state: "on-call", campaign: "PI Intake", duration: 185, callsToday: 12, avgHandle: 245 },
  { name: "Bob Martinez", state: "available", campaign: "Family Law", duration: 30, callsToday: 8, avgHandle: 310 },
  { name: "Carol Thompson", state: "acw", campaign: "PI Intake", duration: 45, callsToday: 15, avgHandle: 198 },
  { name: "Dan Lee", state: "on-call", campaign: "Workers Comp", duration: 340, callsToday: 6, avgHandle: 425 },
  { name: "Eve Wilson", state: "break", campaign: "PI Intake", duration: 600, callsToday: 10, avgHandle: 220 },
  { name: "Frank Brown", state: "available", campaign: "Family Law", duration: 15, callsToday: 11, avgHandle: 275 },
  { name: "Grace Kim", state: "on-call", campaign: "PI Intake", duration: 90, callsToday: 14, avgHandle: 205 },
  { name: "Henry Davis", state: "offline", campaign: "", duration: 0, callsToday: 0, avgHandle: 0 },
];

const MOCK_QUEUES = [
  { name: "PI Intake", callsWaiting: 3, longestWait: 45, agentsAvailable: 2, serviceLevel: 88 },
  { name: "Family Law", callsWaiting: 1, longestWait: 12, agentsAvailable: 2, serviceLevel: 95 },
  { name: "Workers Comp", callsWaiting: 0, longestWait: 0, agentsAvailable: 1, serviceLevel: 92 },
];

const MOCK_DISP = [
  { name: "Intake Complete", value: 42 },
  { name: "Callback Requested", value: 18 },
  { name: "Wrong Number", value: 8 },
  { name: "Voicemail", value: 12 },
  { name: "Transferred", value: 15 },
  { name: "No Answer", value: 5 },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--warning))"];

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export default function SupervisorPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const activeAgents = MOCK_AGENTS.filter(a => a.state !== "offline");
  const onCall = MOCK_AGENTS.filter(a => a.state === "on-call").length;
  const available = MOCK_AGENTS.filter(a => a.state === "available").length;
  const totalCallsWaiting = MOCK_QUEUES.reduce((s, q) => s + q.callsWaiting, 0);
  const avgServiceLevel = Math.round(MOCK_QUEUES.reduce((s, q) => s + q.serviceLevel, 0) / MOCK_QUEUES.length);

  const leaderboard = [...MOCK_AGENTS]
    .filter(a => a.callsToday > 0)
    .sort((a, b) => b.callsToday - a.callsToday);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6" /> Supervisor Console
          </h1>
          <p className="text-sm text-muted-foreground">Real-time agent monitoring and queue management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">Active Agents</span></div>
          <p className="text-2xl font-bold">{activeAgents.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">On Call</span></div>
          <p className="text-2xl font-bold text-primary">{onCall}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Signal className="h-4 w-4" /><span className="text-xs">Available</span></div>
          <p className="text-2xl font-bold text-success">{available}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs">In Queue</span></div>
          <p className="text-2xl font-bold text-warning">{totalCallsWaiting}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Gauge className="h-4 w-4" /><span className="text-xs">Service Level</span></div>
          <p className="text-2xl font-bold">{avgServiceLevel}%</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agent Board</TabsTrigger>
          <TabsTrigger value="queues">Queue Monitor</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* Agent Status Board */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MOCK_AGENTS.map((agent, i) => (
              <Card key={i} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${stateColors[agent.state]}`} />
                <CardContent className="pt-5 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium truncate">{agent.name}</h4>
                    <Badge variant={stateBadgeVariant[agent.state]} className="text-xs capitalize">
                      {agent.state.replace("-", " ")}
                    </Badge>
                  </div>
                  {agent.state !== "offline" && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {agent.campaign && <p>Campaign: {agent.campaign}</p>}
                      <p>Duration: {formatDuration(agent.duration)}</p>
                      <p>Calls today: {agent.callsToday}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Queue Monitor */}
        <TabsContent value="queues" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_QUEUES.map((q, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{q.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Calls Waiting</p>
                      <p className={`text-2xl font-bold ${q.callsWaiting > 2 ? "text-destructive" : ""}`}>{q.callsWaiting}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Longest Wait</p>
                      <p className="text-2xl font-bold font-mono">{formatDuration(q.longestWait)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Service Level</span>
                      <span className="font-medium">{q.serviceLevel}%</span>
                    </div>
                    <Progress value={q.serviceLevel} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">{q.agentsAvailable} agents available</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Disposition Stats */}
        <TabsContent value="dispositions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Disposition Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={MOCK_DISP} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {MOCK_DISP.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Disposition Volume</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MOCK_DISP} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Rankings */}
        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" /> Agent Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg Handle</TableHead>
                    <TableHead>Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((agent, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>
                        <Badge variant={stateBadgeVariant[agent.state]} className="capitalize text-xs">{agent.state.replace("-", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{agent.callsToday}</TableCell>
                      <TableCell className="text-right font-mono">{formatDuration(agent.avgHandle)}</TableCell>
                      <TableCell>{agent.campaign}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
