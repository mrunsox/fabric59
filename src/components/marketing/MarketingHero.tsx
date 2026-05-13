import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CtaRow } from "@/components/marketing/CtaRow";

interface CtaAction {
  label: string;
  to: string;
}

interface MarketingHeroProps {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  primary?: CtaAction;
  secondary?: CtaAction;
  visual?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/**
 * Phase H — Canonical premium marketing hero.
 *
 * Quiet, enterprise-calm. Eyebrow + headline + lede + CtaRow + optional
 * visual slot. Tokens only. No badges. No fake metrics.
 */
export function MarketingHero({
  eyebrow,
  title,
  lede,
  primary,
  secondary,
  visual,
  align = "center",
  className,
}: MarketingHeroProps) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border/30",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,hsl(var(--primary)/0.08),transparent_60%)]"
      />
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className={cn("grid gap-12", visual ? "lg:grid-cols-[1.2fr_1fr] items-center" : "")}>
          <div className={cn("max-w-3xl", visual ? "" : alignCls)}>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-5">
                {eyebrow}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground">
              {title}
            </h1>
            {lede && (
              <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {lede}
              </p>
            )}
            {primary && (
              <div className="mt-8">
                <CtaRow
                  primary={primary}
                  secondary={secondary}
                  align={visual ? "left" : align}
                />
              </div>
            )}
          </div>
          {visual && <div className="relative">{visual}</div>}
        </div>
      </div>
    </section>
  );
}
