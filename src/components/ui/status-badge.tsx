import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
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
        clio: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        workiz: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        salesforce: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        generic_rest: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        other: "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, children, className, dot = false }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
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
            variant === "info" && "bg-primary"
          )}
        />
      )}
      {children}
    </span>
  );
}
