/**
 * BrainTable — Phase 2 density-aware table wrapper.
 *
 * Presentation only. A thin wrapper around <table> with sticky header,
 * zebra rows, and density variants matching the Brain row-height tokens
 * (--bb-row-h-sm/md/lg). Callers compose their own rows/cells.
 */
import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BrainTableDensity = "sm" | "md" | "lg";

interface Props extends HTMLAttributes<HTMLTableElement> {
  density?: BrainTableDensity;
  zebra?: boolean;
  /** Sticky header (requires the parent to constrain height). */
  stickyHeader?: boolean;
  children: ReactNode;
}

const ROW_HEIGHT: Record<BrainTableDensity, string> = {
  sm: "[&_tbody_tr]:h-[var(--bb-row-h-sm)]",
  md: "[&_tbody_tr]:h-[var(--bb-row-h-md)]",
  lg: "[&_tbody_tr]:h-[var(--bb-row-h-lg)]",
};

export function BrainTable({
  density = "md",
  zebra = true,
  stickyHeader,
  className,
  children,
  ...rest
}: Props) {
  return (
    <table
      data-bb-table-density={density}
      className={cn(
        "w-full text-sm bb-tnum",
        "[&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:px-3 [&_th]:py-2",
        "[&_td]:px-3 [&_td]:py-2 [&_td]:align-middle",
        "[&_tbody_tr]:border-t [&_tbody_tr]:border-bb-border-subtle",
        "[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-bb-fast [&_tbody_tr:hover]:bg-bb-surface-inset",
        zebra && "[&_tbody_tr:nth-child(even)]:bg-bb-surface-inset/60",
        stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-bb-surface-2 [&_thead]:z-10",
        ROW_HEIGHT[density],
        className,
      )}
      {...rest}
    >
      {children}
    </table>
  );
}

export default BrainTable;
