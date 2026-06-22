import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase 3 — Canonical log page primitive.
 *
 * Header + optional stat tiles + filter slot + body (typically a table).
 * Used by the Notifications "Deliveries" tab and similar history surfaces.
 * Paired with a sibling ConfigPage when a surface has both a log and the
 * rules/triggers that produced it.
 */
export interface LogStat {
  label: string;
  value: number | string;
  tone?: "default" | "destructive";
}

interface LogPageProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
  stats?: LogStat[];
  filters?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function LogPage({
  eyebrow,
  title,
  lede,
  action,
  stats,
  filters,
  className,
  children,
}: LogPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        action={action}
      />
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    s.tone === "destructive"
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {filters && <div className="flex flex-wrap gap-3 items-center">{filters}</div>}
      {children}
    </div>
  );
}

export default LogPage;
