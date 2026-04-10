import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PremiumEmptyState } from "./premium-empty-state";
import { Skeleton } from "./skeleton";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface PremiumTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  loadingRows?: number;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  filterBar?: ReactNode;
  className?: string;
}

export function PremiumTable<T>({
  columns, data, keyExtractor, isLoading, loadingRows = 5,
  emptyIcon, emptyTitle = "No data", emptyDescription = "There's nothing to show yet.",
  onRowClick, filterBar, className,
}: PremiumTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn("surface-raised overflow-hidden", className)}>
        {filterBar && <div className="surface-inset px-4 py-3 border-b border-border/50">{filterBar}</div>}
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("text-caption", col.className)}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={i} className="border-border">
                {columns.map((col) => (
                  <TableCell key={col.key}><Skeleton className="h-4 w-3/4 skeleton-premium" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0 && emptyIcon) {
    return <PremiumEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div className={cn("surface-raised overflow-hidden", className)}>
      {filterBar && <div className="surface-inset px-4 py-3 border-b border-border/50">{filterBar}</div>}
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
            {columns.map((col) => (
              <TableHead key={col.key} className={cn("text-caption sticky top-0", col.className)}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              className={cn(
                "border-border transition-premium hover:bg-muted/15",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>{col.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
