import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  cta?: ReactNode;
  className?: string;
}

/**
 * Phase G — Shared marketing section intro.
 * Eyebrow + heading + lede + optional CTA row. Tokens only, no badges.
 */
export function SectionIntro({ eyebrow, title, lede, align = "center", cta, className }: SectionIntroProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          {lede}
        </p>
      )}
      {cta && <div className={cn("mt-6 flex gap-3", align === "center" ? "justify-center" : "justify-start")}>{cta}</div>}
    </div>
  );
}
