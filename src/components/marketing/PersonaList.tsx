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
 * Phase 4 — Persona panels aligned to the Brain panel chrome.
 *
 * Two-column layout: left rail with icon + role; right column with
 * jobs and an optional motion link. Tokens only.
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
            className="bb-panel scroll-mt-24 p-6 flex flex-col"
          >
            <div className="flex items-start gap-4 pb-5 border-b border-border/40">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/12 to-primary/[0.04] ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-1">
                  Role
                </p>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {p.role}
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mt-5 mb-3">
              Day-to-day
            </p>
            <ul className="space-y-2 flex-1">
              {p.jobs.map((j) => (
                <li
                  key={j}
                  className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2.5"
                >
                  <span
                    aria-hidden
                    className="mt-[7px] h-1 w-1 rounded-full bg-primary/60 shrink-0"
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
