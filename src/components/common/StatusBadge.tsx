import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Phase 11 — Canonical status badge primitive.
 *
 * Use this anywhere we render a lifecycle / health / queue status so the
 * vocabulary and tone stay consistent across workspace surfaces (campaigns,
 * guides, runs, QA, integrations, billing).
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-primary/10 text-primary border-primary/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

/**
 * Best-effort mapping of common backend statuses to a canonical tone.
 * Unknown values fall back to neutral.
 */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // lifecycle
  draft: "neutral",
  pending: "warning",
  in_review: "info",
  ready: "success",
  live: "success",
  active: "success",
  published: "success",
  completed: "success",
  paused: "warning",
  archived: "neutral",
  blocked: "danger",
  failed: "danger",
  error: "danger",
  // health
  healthy: "success",
  degraded: "warning",
  down: "danger",
  // billing
  paid: "success",
  unpaid: "warning",
  overdue: "danger",
};

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolvedTone: StatusTone = tone ?? STATUS_TONE_MAP[status?.toLowerCase()] ?? "neutral";
  const label = status?.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", TONE_CLASSES[resolvedTone], className)}>
      {label}
    </Badge>
  );
}
