import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]",
  {
    variants: {
      variant: {
        active: "bg-success/15 text-success border-success/30",
        inactive: "bg-muted text-muted-foreground border-border",
        pending: "bg-warning/15 text-warning border-warning/30",
        pending_verification: "bg-warning/15 text-warning border-warning/30",
        success: "bg-success/15 text-success border-success/30",
        warning: "bg-warning/15 text-warning border-warning/30",
        error: "bg-destructive/15 text-destructive border-destructive/30",
        info: "bg-primary/15 text-primary border-primary/30",
        default: "bg-muted text-muted-foreground border-border",
        syncing: "bg-primary/15 text-primary border-primary/30",
        review: "bg-[hsl(var(--pending-review))]/15 text-[hsl(var(--pending-review))] border-[hsl(var(--pending-review))]/30",
        disconnected: "bg-muted text-muted-foreground/70 border-border",
        clio: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        workiz: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        salesforce: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        hubspot: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        zendesk: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        generic_rest: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        other: "bg-muted text-muted-foreground border-border",
      },
      size: {
        sm: "px-2 py-px text-[10px]",
        default: "px-3 py-0.5 text-xs",
        lg: "px-3.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "info",
      size: "default",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, size, children, className, dot = false }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant, size }), className)}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "active" && "bg-success",
            variant === "pending" && "bg-warning",
            variant === "pending_verification" && "bg-warning",
            variant === "warning" && "bg-warning",
            variant === "error" && "bg-destructive",
            variant === "success" && "bg-success",
            variant === "inactive" && "bg-muted-foreground",
            variant === "default" && "bg-muted-foreground",
            variant === "info" && "bg-primary",
            variant === "syncing" && "bg-primary animate-pulse",
            variant === "review" && "bg-[hsl(var(--pending-review))]",
            variant === "disconnected" && "bg-muted-foreground/50"
          )}
        />
      )}
      {children}
    </span>
  );
}
