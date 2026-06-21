/**
 * ASC — shared provenance badge.
 * Phase 2: rebuilt on Brain tonal tokens (bb-badge recipes). No prop changes.
 */
import { cn } from "@/lib/utils";
import type { AscBranchOrigin } from "@/lib/asc/types";

const LABELS: Record<AscBranchOrigin, string> = {
  user_stated: "You said this",
  inferred_best_practice: "Best-practice suggestion",
  unresolved_recommendation: "Recommendation",
};

const TONE: Record<AscBranchOrigin, string> = {
  user_stated: "bb-badge bb-badge-info",
  inferred_best_practice: "bb-badge bb-badge-muted",
  unresolved_recommendation: "bb-badge bb-badge-warn border-dashed",
};

const DOT: Record<AscBranchOrigin, string> = {
  user_stated: "bg-[hsl(var(--bb-status-info))]",
  inferred_best_practice: "border border-muted-foreground/50",
  unresolved_recommendation: "border border-[hsl(var(--bb-status-warn))] border-dashed",
};

export interface ProvenanceBadgeProps {
  provenance: AscBranchOrigin;
  className?: string;
  showLabel?: boolean;
}

export function ProvenanceBadge({
  provenance,
  className,
  showLabel = true,
}: ProvenanceBadgeProps) {
  return (
    <span
      data-testid={`asc-provenance-${provenance}`}
      data-provenance={provenance}
      className={cn(TONE[provenance], "gap-1", className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT[provenance])}
        aria-hidden
      />
      {showLabel && <span>{LABELS[provenance]}</span>}
    </span>
  );
}
