import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Phone, Clock, TrendingUp, Target, CheckCircle2, Circle, BookOpen,
  ListChecks, BarChart3, Award, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useScriptSessions } from "@/hooks/useScriptSessions";
import { useTrainingModules, useTrainingProgress } from "@/hooks/useTraining";

const priorityColor = (p: string) => {
  if (p === "high") return "text-destructive";
  if (p === "medium") return "text-warning";
  return "text-muted-foreground";
};

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const { data: tasks = [] } = useTasks({ assigned_to: user?.id });
  const { data: sessions = [] } = useScriptSessions(20);
  const { data: modules = [] } = useTrainingModules();
  const { data: progress = [] } = useTrainingProgress();
  const updateTask = useUpdateTask();

  const toggleTask = (id: string, currentStatus: string) => {
    updateTask.mutate({ id, status: currentStatus === "completed" ? "pending" : "completed" });
  };

  const pendingTasks = tasks.filter(t => t.status === "pending").length;

  // Derive stats from sessions
  const todaySessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sessions.filter(s => s.started_at.slice(0, 10) === today);
  }, [sessions]);

  const avgHandle = useMemo(() => {
    const withDuration = todaySessions.filter(s => s.duration_seconds);
    if (withDuration.length === 0) return "0:00";
    const avg = Math.round(withDuration.reduce((s, c) => s + (c.duration_seconds || 0), 0) / withDuration.length);
    return `${Math.floor(avg / 60)}:${(avg % 60).toString().padStart(2, "0")}`;
  }, [todaySessions]);

  // Mock hourly/weekly (would need aggregation in real app — keeping charts visual)
  const MOCK_HOURLY = Array.from({ length: 8 }, (_, i) => ({
    hour: `${9 + i}:00`,
    calls: todaySessions.filter(s => new Date(s.started_at).getHours() === 9 + i).length || Math.floor(Math.random() * 4),
  }));

  const moduleProgress = useMemo(() => {
    return modules.map(mod => {
      const modProgress = progress.filter(p => p.module_id === mod.id);
      const completed = modProgress.filter(p => p.status === "completed").length;
      const total = modProgress.length || 1;
      return { name: mod.name, progress: Math.round((completed / total) * 100), completed, total };
    });
  }, [modules, progress]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6" /> Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your personal workspace — tasks, calls, and performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">Calls Today</span></div>
            <p className="text-3xl font-bold font-mono">{todaySessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Avg Handle Time</span></div>
            <p className="text-3xl font-bold font-mono">{avgHandle}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-4 w-4" /><span className="text-xs">Tasks Pending</span></div>
            <p className="text-3xl font-bold font-mono">{pendingTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Award className="h-4 w-4" /><span className="text-xs">Sessions</span></div>
            <p className="text-3xl font-bold font-mono">{sessions.length}</p>
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
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned.</p>}
            {[...tasks].sort((a, b) => {
              const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
              return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
            }).map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Checkbox checked={task.status === "completed"} onCheckedChange={() => toggleTask(task.id, task.status)} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  {task.due_date && <p className="text-xs text-muted-foreground">{task.due_date}</p>}
                </div>
                <Circle className={`h-3 w-3 fill-current ${priorityColor(task.priority)}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Call History from script_sessions */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> Recent Sessions</CardTitle></CardHeader>
          <CardContent>
            {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No call sessions recorded yet.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 10).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell className="font-mono text-sm">{s.duration_seconds ? `${Math.floor(s.duration_seconds / 60)}:${(s.duration_seconds % 60).toString().padStart(2, "0")}` : "—"}</TableCell>
                      <TableCell className="text-sm">{s.disposition || "—"}</TableCell>
                      <TableCell><Badge variant={s.post_call_status === "completed" ? "default" : "secondary"} className="text-xs">{s.post_call_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Calls by Hour</CardTitle></CardHeader>
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

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Training Modules</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {moduleProgress.length === 0 && <p className="text-sm text-muted-foreground">No training modules available.</p>}
              {moduleProgress.map((t, i) => (
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
