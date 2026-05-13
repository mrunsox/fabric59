import { cn } from "@/lib/utils";

interface ProofQuoteProps {
  quote: string;
  attribution?: string;
  context?: string;
  className?: string;
}

/**
 * Phase H — Single calm text-only proof quote.
 *
 * No logos, no fake company names, no inflated attribution. Use only when
 * you have a real quote that has been cleared with the source.
 */
export function ProofQuote({ quote, attribution, context, className }: ProofQuoteProps) {
  return (
    <figure
      className={cn(
        "max-w-2xl mx-auto text-center",
        className,
      )}
    >
      <blockquote className="text-lg md:text-xl text-foreground leading-relaxed font-medium tracking-tight">
        “{quote}”
      </blockquote>
      {(attribution || context) && (
        <figcaption className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {attribution}
          {attribution && context && <span className="mx-2 opacity-60">·</span>}
          {context}
        </figcaption>
      )}
    </figure>
  );
}
