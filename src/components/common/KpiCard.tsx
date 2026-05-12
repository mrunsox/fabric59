import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  loading?: boolean;
  className?: string;
}

/**
 * Phase 8 — Canonical KPI card primitive.
 * Use across all workspace dashboards/analytics surfaces.
 */
export function KpiCard({ label, value, hint, icon: Icon, trend, loading, className }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-5 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {loading ? <span className="text-muted-foreground/40">…</span> : value}
        </div>
        {(hint || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span className={trend.positive ? "text-success" : "text-muted-foreground"}>
                {trend.value}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
