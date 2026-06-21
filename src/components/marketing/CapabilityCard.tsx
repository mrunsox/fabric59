import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets?: string[];
  tone?: "default" | "raised" | "inset";
  className?: string;
}

/**
 * Phase 4 — Canonical marketing capability card.
 *
 * `tone="raised"` matches the Brain `bb-card-raised` recipe; `tone="inset"`
 * uses the inset surface for cards placed on light backgrounds.
 * No status / readiness / "live" / "coming soon" badges — capability language only.
 */
export function CapabilityCard({
  icon: Icon,
  title,
  body,
  bullets,
  tone = "default",
  className,
}: CapabilityCardProps) {
  const base =
    tone === "raised"
      ? "bb-card-raised"
      : tone === "inset"
        ? "rounded-2xl border border-border/60 bg-[hsl(var(--bb-surface-inset))]"
        : "rounded-2xl border border-border/60 bg-card";
  return (
    <div
      className={cn(
        "group relative h-full p-6 transition-[border-color,box-shadow,transform] duration-200 hover:border-primary/40 hover:shadow-[0_1px_0_hsl(var(--primary)/0.18),0_10px_30px_-18px_hsl(var(--primary)/0.25)]",
        base,
        className,
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/12 to-primary/[0.04] ring-1 ring-primary/20 flex items-center justify-center mb-5">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground tracking-tight leading-snug">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
