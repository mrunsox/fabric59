/**
 * BrainStatCard — Phase 2 metric card.
 *
 * Presentation only. Renders a label + value, optional delta and sparkline.
 *
 * Per Phase 2 scope guards: sparklines are OPTIONAL. Callers must omit
 * `sparkline` when underlying data is weak / sparse — never render a
 * placeholder shape. `state` lets callers distinguish "no data" from
 * "failed" without raw colors.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrainStatState = "ready" | "loading" | "noData" | "failed";

interface Props {
  label: ReactNode;
  /** The headline number / value. Hidden when state !== "ready". */
  value?: ReactNode;
  /** Tiny suffix shown after value, e.g. "facts". */
  unit?: ReactNode;
  /** Pre-formatted delta string, e.g. "+12 vs 30d". */
  delta?: ReactNode;
  deltaDirection?: "up" | "down" | "flat";
  /** Optional sparkline node. Omit entirely when data is weak. */
  sparkline?: ReactNode;
  state?: BrainStatState;
  hint?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const DELTA_TONE: Record<NonNullable<Props["deltaDirection"]>, string> = {
  up: "bb-badge bb-badge-ok",
  down: "bb-badge bb-badge-bad",
  flat: "bb-badge bb-badge-muted",
};

export function BrainStatCard({
  label,
  value,
  unit,
  delta,
  deltaDirection = "flat",
  sparkline,
  state = "ready",
  hint,
  className,
  ...rest
}: Props) {
  return (
    <article
      data-testid={rest["data-testid"]}
      data-bb-stat-state={state}
      className={cn("bb-card-raised p-4 flex flex-col gap-2", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {state === "failed" ? (
          <span className="bb-badge bb-badge-bad">Failed</span>
        ) : state === "noData" ? (
          <span className="bb-badge bb-badge-muted">No data</span>
        ) : state === "loading" ? (
          <span className="bb-badge bb-badge-muted">Loading</span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1.5">
        {state === "ready" ? (
          <>
            <span className="bb-tnum text-2xl font-semibold text-foreground">{value}</span>
            {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
          </>
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground/50">—</span>
        )}
      </div>

      {(delta || sparkline) && state === "ready" ? (
        <div className="flex items-center justify-between gap-3">
          {delta ? <span className={DELTA_TONE[deltaDirection]}>{delta}</span> : <span />}
          {sparkline ? <div className="h-6 min-w-[64px]">{sparkline}</div> : null}
        </div>
      ) : null}

      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </article>
  );
}

export default BrainStatCard;
