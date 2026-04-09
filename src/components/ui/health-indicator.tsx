import { cn } from "@/lib/utils";

type HealthStatus = "healthy" | "degraded" | "critical" | "offline";

interface HealthIndicatorProps {
  status: HealthStatus;
  label?: string;
  className?: string;
  showPulse?: boolean;
}

const config: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  healthy: {
    dot: "bg-success",
    text: "text-success",
    label: "Healthy",
  },
  degraded: {
    dot: "bg-warning",
    text: "text-warning",
    label: "Degraded",
  },
  critical: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "Critical",
  },
  offline: {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    label: "Offline",
  },
};

export function HealthIndicator({ status, label, className, showPulse = true }: HealthIndicatorProps) {
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.text, className)}>
      <span className="relative flex h-2 w-2">
        {showPulse && status === "healthy" && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-40", c.dot)} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", c.dot)} />
      </span>
      {label ?? c.label}
    </span>
  );
}
