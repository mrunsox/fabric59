import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 5 — Canonical org page header.
 *
 * Mirrors WorkspacePageHeader but for /org/* surfaces. One eyebrow + title +
 * lede + single primary action slot. Pages should not render their own h1.
 */
interface OrgPageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

export function OrgPageHeader({ eyebrow, title, lede, action, secondary, className }: OrgPageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {lede && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{lede}</p>}
      </div>
      {(action || secondary) && (
        <div className="flex items-center gap-2 shrink-0">
          {secondary}
          {action}
        </div>
      )}
    </div>
  );
}

export default OrgPageHeader;
