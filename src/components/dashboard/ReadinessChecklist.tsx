import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientReadiness } from "@/lib/readiness/computeCampaignReadiness";
import { getClientChecklist } from "@/lib/readiness/computeCampaignReadiness";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", className: "bg-primary/10 text-primary" },
  blocked: { label: "Blocked", className: "bg-destructive/10 text-destructive" },
  test_ready: { label: "Test ready", className: "bg-warning/10 text-warning" },
  ready: { label: "Ready", className: "bg-success/10 text-success" },
};

export function ReadinessChecklist({
  readiness,
  loading,
  title = "Setup Progress",
}: {
  readiness: ClientReadiness | null;
  loading?: boolean;
  title?: string;
}) {
  const items = getClientChecklist(readiness);
  const completed = items.filter((i) => i.done).length;
  const pct = Math.round((completed / items.length) * 100);
  const status = readiness?.status ?? "not_started";
  const sLabel = STATUS_LABEL[status];

  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {completed} of {items.length} steps complete
          </p>
        </div>
        <Badge className={cn("text-xs font-medium", sLabel.className)}>{sLabel.label}</Badge>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
            ))
          : items.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={cn("text-sm flex-1", item.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {item.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </Link>
            ))}
      </div>
    </div>
  );
}
