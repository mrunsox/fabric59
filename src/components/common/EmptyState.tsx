import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Phase 8 — Canonical empty state primitive.
 * Use across all workspace surfaces for consistency.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="py-12 text-center space-y-3">
        {Icon && <Icon className="h-8 w-8 mx-auto text-muted-foreground/40" />}
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
          )}
        </div>
        {action && <div className="pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
