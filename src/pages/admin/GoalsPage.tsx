import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Archive, TrendingUp } from "lucide-react";
import { usePerformanceGoals, useCreatePerformanceGoal, useUpdatePerformanceGoal } from "@/hooks/usePerformanceGoals";

const METRICS = [
  { value: "completed_calls", label: "Completed Calls" },
  { value: "booked_consults", label: "Booked Consults" },
  { value: "aht", label: "Avg Handle Time (sec)" },
  { value: "qa_score", label: "QA Score" },
  { value: "custom", label: "Custom" },
];

const TIMEFRAMES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom Range" },
];

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const { data: goals = [], isLoading } = usePerformanceGoals(statusFilter);
  const createGoal = useCreatePerformanceGoal();
  const updateGoal = useUpdatePerformanceGoal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", metric: "", target_value: "", timeframe: "monthly", description: "" });

  const handleCreate = () => {
    if (!form.name || !form.metric || !form.target_value) return;
    createGoal.mutate(
      { name: form.name, metric: form.metric, target_value: parseFloat(form.target_value), timeframe: form.timeframe, description: form.description || undefined },
      { onSuccess: () => { setDialogOpen(false); setForm({ name: "", metric: "", target_value: "", timeframe: "monthly", description: "" }); } }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Goals & Coaching</h1>
          <p className="text-sm text-muted-foreground">Track agent and team performance targets</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Goal</Button>
      </div>

      <div className="flex gap-2">
        <Button variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")}>Active</Button>
        <Button variant={statusFilter === "archived" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("archived")}>Archived</Button>
      </div>

      {isLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading…</div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No {statusFilter} goals. Create a goal to start tracking performance.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const metricLabel = METRICS.find(m => m.value === goal.metric)?.label || goal.metric;
            // Progress would come from aggregated call data — placeholder at 0
            const progress = 0;
            const pct = goal.target_value > 0 ? Math.min((progress / goal.target_value) * 100, 100) : 0;

            return (
              <Card key={goal.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    <Badge variant={goal.status === "active" ? "default" : "secondary"}>{goal.status}</Badge>
                  </div>
                  {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{metricLabel}</span>
                    <span className="font-mono font-medium">{progress} / {goal.target_value}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{goal.timeframe}</span>
                    <div className="flex gap-1">
                      {goal.status === "active" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateGoal.mutate({ id: goal.id, status: "archived" })}>
                          <Archive className="h-3 w-3 mr-1" /> Archive
                        </Button>
                      )}
                      {goal.status === "archived" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateGoal.mutate({ id: goal.id, status: "active" })}>
                          <TrendingUp className="h-3 w-3 mr-1" /> Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Performance Goal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 50 booked consults this month" />
            </div>
            <div>
              <Label>Metric</Label>
              <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                <SelectContent>{METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Value</Label>
              <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} placeholder="e.g. 50" />
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={form.timeframe} onValueChange={v => setForm(f => ({ ...f, timeframe: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEFRAMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Goal details…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.metric || !form.target_value}>Create Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
