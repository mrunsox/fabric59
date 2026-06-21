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
 * Phase 4 — Shared marketing section intro.
 * Eyebrow recipe aligns with BrainPageHeader (11px, tracking-[0.22em]).
 */
export function SectionIntro({
  eyebrow,
  title,
  lede,
  align = "center",
  cta,
  className,
}: SectionIntroProps) {
  return (
    <div
      className={cn(
        align === "center" ? "max-w-3xl mx-auto text-center" : "max-w-3xl text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
        {title}
      </h2>
      {lede && (
        <p
          className={cn(
            "mt-4 text-base text-muted-foreground leading-relaxed",
            align === "center" ? "max-w-2xl mx-auto" : "max-w-2xl",
          )}
        >
          {lede}
        </p>
      )}
      {cta && (
        <div
          className={cn(
            "mt-6 flex gap-3",
            align === "center" ? "justify-center" : "justify-start",
          )}
        >
          {cta}
        </div>
      )}
    </div>
  );
}
