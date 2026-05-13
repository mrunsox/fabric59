import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets?: string[];
  className?: string;
}

/**
 * Phase G — Canonical marketing capability card.
 *
 * Strictly no status / readiness / "live" / "coming soon" badges. This card
 * communicates capability category language only. For lifecycle status use
 * the operational `<StatusBadge />` primitive on workspace/admin surfaces.
 */
export function CapabilityCard({ icon: Icon, title, body, bullets, className }: CapabilityCardProps) {
  return (
    <div
      className={cn(
        "group relative h-full rounded-2xl border border-border/60 bg-card/80 p-6 transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.18)]",
        className,
      )}
    >
      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
