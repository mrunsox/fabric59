import { cn } from "@/lib/utils";

interface ProofQuoteProps {
  quote: string;
  attribution?: string;
  context?: string;
  className?: string;
}

/**
 * Phase 4 — Inset framed proof quote with a thin primary accent rule.
 *
 * No logos, no fake company names, no inflated attribution. Use only when
 * you have a real quote that has been cleared with the source.
 */
export function ProofQuote({ quote, attribution, context, className }: ProofQuoteProps) {
  return (
    <figure
      className={cn(
        "relative max-w-3xl mx-auto rounded-2xl border border-border/60 bg-[hsl(var(--bb-surface-inset))] px-8 py-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-primary/40"
      />
      <blockquote className="text-lg md:text-xl text-foreground leading-relaxed font-medium tracking-tight">
        “{quote}”
      </blockquote>
      {(attribution || context) && (
        <figcaption className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {attribution}
          {attribution && context && <span className="mx-2 opacity-60">·</span>}
          {context}
        </figcaption>
      )}
    </figure>
  );
}
