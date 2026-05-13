import { cn } from "@/lib/utils";

interface ProofStripProps {
  items: string[];
  className?: string;
}

/**
 * Phase G — Calm, text-only proof strip.
 * No fake logos, no fabricated metrics. Use short factual phrases only.
 */
export function ProofStrip({ items, className }: ProofStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={item} className="flex items-center gap-3">
          <span>{item}</span>
          {i < items.length - 1 && <span aria-hidden className="hidden sm:inline h-1 w-1 rounded-full bg-border" />}
        </div>
      ))}
    </div>
  );
}
