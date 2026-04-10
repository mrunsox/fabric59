import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type BannerVariant = "info" | "warning" | "success" | "destructive";

interface ActionBannerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  variant?: BannerVariant;
  className?: string;
  children?: ReactNode;
}

const variantStyles: Record<BannerVariant, string> = {
  info: "border-primary/20 bg-primary/5",
  warning: "border-warning/20 bg-warning/5",
  success: "border-success/20 bg-success/5",
  destructive: "border-destructive/20 bg-destructive/5",
};

const iconStyles: Record<BannerVariant, string> = {
  info: "text-primary",
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
};

export function ActionBanner({
  icon: Icon, title, description, action, onDismiss, variant = "info", className, children,
}: ActionBannerProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4 transition-premium animate-fade-up", variantStyles[variant], className)}>
      {Icon && (
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn("h-4 w-4", iconStyles[variant])} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        {children}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action && (
          <Button size="sm" variant="outline" onClick={action.onClick} className="h-7 text-xs">
            {action.label}
          </Button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
