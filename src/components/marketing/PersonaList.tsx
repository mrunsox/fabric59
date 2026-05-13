import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface PersonaItem {
  icon: LucideIcon;
  role: string;
  jobs: string[];
  motionLabel?: string;
  motionHref?: string;
  anchorId?: string;
}

interface PersonaListProps {
  items: PersonaItem[];
  className?: string;
}

/**
 * Phase H — Premium persona cards.
 *
 * Role + jobs-to-be-done, optional link to a related operating motion.
 * No badges. No fake titles. Tokens only.
 */
export function PersonaList({ items, className }: PersonaListProps) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)}>
      {items.map((p) => {
        const Icon = p.icon;
        return (
          <article
            key={p.role}
            id={p.anchorId}
            className="rounded-2xl border border-border/60 bg-card/80 p-6 flex flex-col scroll-mt-24"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {p.role}
              </h3>
            </div>
            <ul className="mt-5 space-y-2">
              {p.jobs.map((j) => (
                <li
                  key={j}
                  className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1 w-1 rounded-full bg-primary/60 shrink-0"
                  />
                  <span>{j}</span>
                </li>
              ))}
            </ul>
            {p.motionLabel && p.motionHref && (
              <Link
                to={p.motionHref}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit"
              >
                {p.motionLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
