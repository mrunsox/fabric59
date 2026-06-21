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
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Phase 4 — Canonical premium marketing hero.
 *
 * Light-futuristic operational tone. Layered, token-driven backdrop:
 *   - soft radial wash, primary-tinted
 *   - faint dot grid for "operational" texture
 *   - hairline divider on bottom
 *
 * Eyebrow renders as a small pill (matches the Brain `info` recipe).
 * Optional `visual` slot renders to the right on lg+ (used by HomePage).
 */
export function MarketingHero({
  eyebrow,
  title,
  lede,
  primary,
  secondary,
  visual,
  align = "center",
  size = "lg",
  className,
}: MarketingHeroProps) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  const padY =
    size === "sm" ? "pt-16 pb-12" : size === "md" ? "pt-20 pb-16" : "pt-24 pb-20";
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border/40",
        className,
      )}
    >
      {/* Radial wash */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,hsl(var(--primary)/0.10),transparent_60%)]"
      />
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]"
      />
      <div className={cn("relative max-w-6xl mx-auto px-6", padY)}>
        <div
          className={cn(
            "grid gap-12",
            visual ? "lg:grid-cols-[1.15fr_1fr] items-center" : "",
          )}
        >
          <div className={cn("max-w-3xl", visual ? "" : alignCls)}>
            {eyebrow && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-6">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                {eyebrow}
              </span>
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
          {visual && <div className="relative lg:pl-4">{visual}</div>}
        </div>
      </div>
    </section>
  );
}
