import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, Clock, TrendingUp, Target, CheckCircle2, Circle, BookOpen,
  ListChecks, BarChart3, Calendar, Timer, Award, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// Mock data for agent dashboard
const MOCK_TASKS = [
  { id: "1", title: "Follow up with Johnson case", priority: "high", dueDate: "2026-03-08", status: "pending" },
  { id: "2", title: "Complete training module: HIPAA", priority: "medium", dueDate: "2026-03-10", status: "pending" },
  { id: "3", title: "Submit weekly call report", priority: "low", dueDate: "2026-03-09", status: "completed" },
  { id: "4", title: "Review new script for PI campaign", priority: "medium", dueDate: "2026-03-08", status: "pending" },
  { id: "5", title: "Callback: Maria Garcia", priority: "high", dueDate: "2026-03-08", status: "pending" },
];

const MOCK_CALL_HISTORY = [
  { time: "14:32", caller: "John Smith", campaign: "PI Intake", duration: "4:22", disposition: "Intake Complete" },
  { time: "14:15", caller: "Sarah Williams", campaign: "Family Law", duration: "2:45", disposition: "Callback Requested" },
  { time: "13:58", caller: "Unknown", campaign: "PI Intake", duration: "0:18", disposition: "Wrong Number" },
  { time: "13:30", caller: "Mike Johnson", campaign: "Workers Comp", duration: "6:12", disposition: "Transferred" },
  { time: "13:10", caller: "Lisa Chen", campaign: "PI Intake", duration: "3:55", disposition: "Intake Complete" },
  { time: "12:45", caller: "Robert Brown", campaign: "Family Law", duration: "1:30", disposition: "Voicemail" },
  { time: "12:20", caller: "Emily Davis", campaign: "PI Intake", duration: "5:02", disposition: "Intake Complete" },
  { time: "11:55", caller: "David Wilson", campaign: "Workers Comp", duration: "3:15", disposition: "Callback Requested" },
];

const MOCK_TRAINING = [
  { name: "HIPAA Compliance", progress: 75, total: 12, completed: 9 },
  { name: "Legal Intake Best Practices", progress: 100, total: 8, completed: 8 },
  { name: "Five9 Agent Desktop", progress: 50, total: 6, completed: 3 },
  { name: "De-escalation Techniques", progress: 30, total: 10, completed: 3 },
];

const MOCK_HOURLY = Array.from({ length: 8 }, (_, i) => ({
  hour: `${9 + i}:00`,
  calls: Math.floor(Math.random() * 12) + 2,
  avgDuration: Math.floor(Math.random() * 180) + 60,
}));

const MOCK_WEEKLY = [
  { day: "Mon", calls: 42, talkMin: 185 },
  { day: "Tue", calls: 38, talkMin: 162 },
  { day: "Wed", calls: 45, talkMin: 198 },
  { day: "Thu", calls: 35, talkMin: 150 },
  { day: "Fri", calls: 40, talkMin: 175 },
];

const priorityColor = (p: string) => {
  if (p === "high") return "text-destructive";
  if (p === "medium") return "text-warning";
  return "text-muted-foreground";
};

export default function AgentDashboardPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t));
  };

  const pendingTasks = tasks.filter(t => t.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" /> Agent Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Your personal workspace — tasks, calls, and performance</p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">Calls Today</span></div>
            <p className="text-3xl font-bold font-mono">{MOCK_CALL_HISTORY.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Avg Handle Time</span></div>
            <p className="text-3xl font-bold font-mono">3:28</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-4 w-4" /><span className="text-xs">Adherence</span></div>
            <p className="text-3xl font-bold font-mono text-success">94%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Award className="h-4 w-4" /><span className="text-xs">FCR Rate</span></div>
            <p className="text-3xl font-bold font-mono">87%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Queue */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Task Queue
              {pendingTasks > 0 && <Badge variant="destructive" className="ml-auto">{pendingTasks}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2);
            }).map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={() => toggleTask(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.dueDate}</p>
                </div>
                <Circle className={`h-3 w-3 fill-current ${priorityColor(task.priority)}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Call History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" /> Today's Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Disposition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CALL_HISTORY.map((call, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{call.time}</TableCell>
                    <TableCell>{call.caller}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{call.campaign}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{call.duration}</TableCell>
                    <TableCell className="text-sm">{call.disposition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calls by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_HOURLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={MOCK_WEEKLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="talkMin" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Training Modules */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Training Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_TRAINING.map((t, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t.name}</h4>
                    <Badge variant={t.progress === 100 ? "default" : "secondary"}>
                      {t.progress === 100 ? "Complete" : `${t.completed}/${t.total}`}
                    </Badge>
                  </div>
                  <Progress value={t.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
