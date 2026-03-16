import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks, Circle, Filter } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";

const priorityColor = (p: string) => {
  if (p === "high") return "text-destructive";
  if (p === "medium") return "text-warning";
  return "text-muted-foreground";
};

interface TaskQueuePanelProps {
  className?: string;
}

export function TaskQueuePanel({ className }: TaskQueuePanelProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const { data: tasks = [] } = useTasks({ assigned_to: user?.id });
  const updateTask = useUpdateTask();

  const filteredTasks = tasks
    .filter(t => statusFilter === "all" || t.status === statusFilter)
    .filter(t => priorityFilter === "all" || t.priority === priorityFilter)
    .sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

  const pendingCount = tasks.filter(t => t.status === "pending").length;

  const toggleTask = (id: string, currentStatus: string) => {
    updateTask.mutate({ id, status: currentStatus === "completed" ? "pending" : "completed" });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Task Queue
          {pendingCount > 0 && <Badge variant="destructive" className="ml-auto">{pendingCount}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTasks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks match your filters.</p>
          )}
          {filteredTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30 transition-colors">
              <Checkbox
                checked={task.status === "completed"}
                onCheckedChange={() => toggleTask(task.id, task.status)}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">{task.due_date}</span>
                  )}
                  {task.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{task.description}</span>
                  )}
                </div>
              </div>
              <Circle className={`h-3 w-3 fill-current ${priorityColor(task.priority)}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
