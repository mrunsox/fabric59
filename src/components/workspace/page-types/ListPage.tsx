import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

/**
 * Phase 3 — Canonical list page primitive.
 *
 * Thin shell over WorkspacePageHeader + optional filter bar + body slot.
 * Pages compose their own table/grid/empty state inside `children`.
 *
 * This primitive is presentational only — it does not own data, filters,
 * or empty-state copy. Its job is to keep the chrome consistent across
 * every workspace list surface (campaigns, guides, templates, forms,
 * clients, dispositions, runs).
 */
interface ListPageProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
  /** Filter / search row rendered above the body. */
  filters?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ListPage({
  eyebrow,
  title,
  lede,
  action,
  filters,
  className,
  children,
}: ListPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        action={action}
      />
      {filters && (
        <div className="flex flex-wrap gap-3 items-center">{filters}</div>
      )}
      {children}
    </div>
  );
}

export default ListPage;
