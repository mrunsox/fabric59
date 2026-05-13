import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Phase G — Hero / premium-scale empty state.
 *
 * Use this when the empty state is the primary content of a page or large
 * section (e.g. brand-new workspace home, first-run integrations gallery).
 * For compact in-panel placeholders, prefer `<EmptyState />` from
 * `@/components/common/EmptyState`.
 */
export function PremiumEmptyState({ icon: Icon, title, description, action, className }: PremiumEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center", className)}>
      <div className="rounded-xl bg-muted/60 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
