import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

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
 * Phase 4 — Operating motions rendered as hairline rows inside a single
 * Brain-style panel. Density-friendly, scan-first.
 */
export function MotionList({ items, className }: MotionListProps) {
  return (
    <div className={cn("bb-panel overflow-hidden", className)}>
      <ul className="divide-y divide-border/40">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="group flex items-start gap-4 p-5 md:p-6 transition-colors hover:bg-muted/30">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/12 to-primary/[0.04] ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.outcome}
                </p>
              </div>
              {item.href && (
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
              )}
            </div>
          );
          return (
            <li key={item.title}>
              {item.href ? (
                <Link
                  to={item.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
