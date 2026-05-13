import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 4 — Canonical workspace page header.
 *
 * One shared chrome for every /w/:workspaceId/* surface:
 * eyebrow → title → 1-line lede → optional primary action slot.
 *
 * Keeps the workspace shell visually coherent regardless of underlying
 * page complexity. Pages should NOT render their own h1 in addition.
 */
interface WorkspacePageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
  /** Optional right-side secondary slot (rare — prefer single primary action). */
  secondary?: ReactNode;
  className?: string;
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  lede,
  action,
  secondary,
  className,
}: WorkspacePageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {lede && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{lede}</p>
        )}
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

export default WorkspacePageHeader;
