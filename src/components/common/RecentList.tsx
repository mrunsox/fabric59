import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

export interface RecentListItem {
  key: string;
  title: string;
  meta?: string;
  href: string;
}

interface RecentListProps {
  items: RecentListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Canonical recent-items list primitive.
 *
 * Promoted from WorkspaceHomePage in the Outline + Data convergence slice.
 * Renders a divided list of links with a title + meta line and falls back
 * to the shared `EmptyState` primitive when the list is empty.
 */
export function RecentList({
  items,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  className,
}: RecentListProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0 divide-y">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.href}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{item.title}</div>
              {item.meta && <div className="text-xs text-muted-foreground">{item.meta}</div>}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
