import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MotionItem {
  icon: LucideIcon;
  title: string;
  outcome: string;
  href?: string;
}

interface MotionListProps {
  items: MotionItem[];
  columns?: 2 | 3;
  className?: string;
}

/**
 * Phase H — Operating-motion list.
 *
 * Used on Landing, Solutions, and the mega menu Solutions panel.
 * Calm icon + title + one-line outcome. No badges, no statuses.
 */
export function MotionList({ items, columns = 3, className }: MotionListProps) {
  const grid = columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={cn("grid gap-4", grid, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div className="group h-full rounded-xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40 hover:bg-card">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/15">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.outcome}
                </p>
              </div>
            </div>
          </div>
        );
        return (
          <li key={item.title}>
            {item.href ? (
              <Link
                to={item.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
