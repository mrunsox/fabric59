/**
 * Live Call Runner — shared UI primitives.
 *
 * Small, intentionally minimal building blocks shared across the runner
 * header and three panels. Extracted only where they remove real duplication
 * (status pills, autosave dot). Anything bigger stays composed inline so the
 * panel files remain readable.
 */
import { Check, Loader2, AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warn" | "danger" | "muted";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border text-foreground bg-background",
  info: "border-primary/30 text-primary bg-primary/5",
  success: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5",
  warn: "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5",
  danger: "border-destructive/40 text-destructive bg-destructive/5",
  muted: "border-border/60 text-muted-foreground bg-muted/30",
};

interface StatusPillProps {
  tone?: StatusTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  title?: string;
  /** Compact mode for header — slightly smaller padding. */
  dense?: boolean;
}

/**
 * Status pill — small chip used for ANI / call id / step counts / required
 * remaining / autosave state. Replaces ad-hoc `<Badge variant="outline">`
 * with a tone-driven, consistent surface.
 */
export function StatusPill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
  title,
  dense,
}: StatusPillProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium tracking-tight",
        dense ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-[11px]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export type AutosaveState = "idle" | "saving" | "saved" | "error";

interface AutosaveIndicatorProps {
  state: AutosaveState;
  /** Last saved ISO timestamp — surfaced as a tooltip + readable suffix. */
  savedAt?: string | null;
  className?: string;
}

/**
 * Autosave dot — visible trust signal for the agent. Renders one of:
 *   idle    →  "Ready"        (muted)
 *   saving  →  "Saving…"      (info, spinner)
 *   saved   →  "Saved · hh:mm"  (success, check)
 *   error   →  "Save failed"    (danger)
 */
export function AutosaveIndicator({ state, savedAt, className }: AutosaveIndicatorProps) {
  if (state === "saving") {
    return (
      <StatusPill tone="info" icon={Loader2} className={cn("animate-in fade-in", className)} dense>
        <span className="flex items-center gap-1">
          <span className="sr-only">Autosave status:</span>
          <span aria-live="polite">Saving…</span>
        </span>
      </StatusPill>
    );
  }
  if (state === "error") {
    return (
      <StatusPill tone="danger" icon={AlertCircle} className={className} dense>
        <span aria-live="assertive">Save failed</span>
      </StatusPill>
    );
  }
  if (state === "saved") {
    const time = savedAt ? new Date(savedAt) : null;
    const label = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now";
    return (
      <StatusPill
        tone="success"
        icon={Check}
        className={className}
        dense
        title={savedAt ? new Date(savedAt).toLocaleString() : undefined}
      >
        Saved · {label}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="muted" className={className} dense>
      Ready
    </StatusPill>
  );
}

interface RunnerSurfaceProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle layered background — used for calm panels (copilot). */
  calm?: boolean;
  /** Removes the border for nested surfaces. */
  flush?: boolean;
}

/**
 * Standard card surface for the three runner panels. Keeps padding rhythm
 * and elevation consistent so panels read as siblings, not as a collage.
 */
export function RunnerSurface({ children, className, calm, flush }: RunnerSurfaceProps) {
  return (
    <div
      className={cn(
        "h-full min-h-0 flex flex-col rounded-lg",
        flush ? "" : "border",
        calm ? "bg-muted/20" : "bg-card",
        "shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
