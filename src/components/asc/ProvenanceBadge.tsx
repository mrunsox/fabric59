/**
 * ASC — shared provenance badge.
 * Visual only; behavior wired in later slices.
 */
import { cn } from "@/lib/utils";
import type { AscBranchOrigin } from "@/lib/asc/types";

const LABELS: Record<AscBranchOrigin, string> = {
  user_stated: "You said this",
  inferred_best_practice: "Best-practice suggestion",
  unresolved_recommendation: "Recommendation",
};

const STYLES: Record<AscBranchOrigin, string> = {
  user_stated:
    "bg-primary/10 text-primary border-primary/40",
  inferred_best_practice:
    "bg-muted text-muted-foreground border-border",
  unresolved_recommendation:
    "bg-amber-50 text-amber-700 border-amber-300 border-dashed",
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
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        STYLES[provenance],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          provenance === "user_stated" && "bg-primary",
          provenance === "inferred_best_practice" &&
            "border border-muted-foreground/60",
          provenance === "unresolved_recommendation" &&
            "border border-amber-500 border-dashed",
        )}
        aria-hidden
      />
      {showLabel && <span>{LABELS[provenance]}</span>}
    </span>
  );
}
