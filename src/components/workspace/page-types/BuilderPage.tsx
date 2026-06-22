import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

/**
 * Phase 3 — Canonical builder page primitive.
 *
 * Full-bleed canvas + optional side panel + optional sticky footer.
 *
 * Phase 3 constraint: this primitive is OPTIONAL. Builders that already
 * have their own save/publish UX (form builder, flow builder, guide
 * builder) should not be retrofitted just for visual consistency — adopt
 * this only when the existing save model matches the footer interaction.
 */
interface BuilderPageProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Header-right action(s) — typically Save/Publish. */
  action?: ReactNode;
  /** Side panel rendered next to the canvas. */
  sidePanel?: ReactNode;
  /** Sticky footer save bar. Only use when it matches existing patterns. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function BuilderPage({
  eyebrow,
  title,
  lede,
  action,
  sidePanel,
  footer,
  className,
  children,
}: BuilderPageProps) {
  return (
    <div className={cn("flex flex-col gap-4 min-h-full", className)}>
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        action={action}
      />
      <div className={cn("flex-1 min-h-0", sidePanel && "grid gap-4 lg:grid-cols-[1fr,320px]")}>
        <div className="min-w-0">{children}</div>
        {sidePanel && <aside className="space-y-3">{sidePanel}</aside>}
      </div>
      {footer && (
        <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 border-t bg-background/95 backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}

export default BuilderPage;
