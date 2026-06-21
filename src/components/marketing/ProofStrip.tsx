import { cn } from "@/lib/utils";

interface ProofStripProps {
  items: string[];
  className?: string;
}

/**
 * Phase 4 — Calm, text-only proof strip rendered as hairline pills.
 * No fake logos, no fabricated metrics. Use short factual phrases only.
 */
export function ProofStrip({ items, className }: ProofStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2.5",
        className,
      )}
    >
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-foreground/80"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          {item}
        </span>
      ))}
    </div>
  );
}
