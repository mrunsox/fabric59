/**
 * BrainPageHeader — Phase 2 page/section header.
 *
 * Presentation only. Standardizes title hierarchy, eyebrow,
 * right-aligned actions, and an optional freshness chip. Used by Brain
 * pages and section sub-headers (eyebrow-only variant).
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** e.g. "Updated 2m ago" — rendered as a subtle right-aligned chip. */
  freshness?: ReactNode;
  className?: string;
  /** Render as a section sub-header (smaller type, no bottom border). */
  variant?: "page" | "section";
}

export function BrainPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  freshness,
  className,
  variant = "page",
}: Props) {
  const isPage = variant === "page";
  return (
    <header
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-end md:justify-between",
        isPage && "pb-4 border-b border-bb-border-subtle",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={cn(
            "min-w-0 truncate text-foreground",
            isPage ? "text-2xl font-semibold tracking-tight" : "text-base font-semibold",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {freshness ? (
          <span className="bb-badge bb-badge-muted bb-tnum" data-testid="brain-freshness">
            {freshness}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
  );
}

export default BrainPageHeader;
