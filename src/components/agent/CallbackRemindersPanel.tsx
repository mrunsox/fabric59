import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Clock, BellRing, X } from "lucide-react";
import { useCallbackReminders } from "@/hooks/useCallbackReminders";
import { useUpdateTask } from "@/hooks/useTasks";

interface CallbackRemindersPanelProps {
  className?: string;
}

function CountdownTimer({ dueDate }: { dueDate: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(dueDate).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Overdue");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [dueDate]);

  const isOverdue = remaining === "Overdue";

  return (
    <span className={`text-xs font-mono ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
      {remaining}
    </span>
  );
}

export function CallbackRemindersPanel({ className }: CallbackRemindersPanelProps) {
  const { data: callbacks = [] } = useCallbackReminders();
  const updateTask = useUpdateTask();

  const sortedCallbacks = useMemo(() => {
    return [...callbacks].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [callbacks]);

  const dismissCallback = (id: string) => {
    updateTask.mutate({ id, status: "completed" });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4" /> Callback Reminders
          {callbacks.length > 0 && <Badge variant="secondary" className="ml-auto">{callbacks.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedCallbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming callbacks.</p>
        ) : (
          sortedCallbacks.map(cb => (
            <div key={cb.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <PhoneCall className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cb.title}</p>
                <div className="flex items-center gap-2">
                  {cb.due_date && (
                    <>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <CountdownTimer dueDate={cb.due_date} />
                    </>
                  )}
                  {cb.description && (
                    <span className="text-xs text-muted-foreground truncate">{cb.description}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => dismissCallback(cb.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
