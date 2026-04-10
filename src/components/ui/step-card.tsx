import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StepStatus = "completed" | "active" | "upcoming";

interface StepCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  status: StepStatus;
  children?: ReactNode;
  expandable?: boolean;
  className?: string;
}

const statusStyles: Record<StepStatus, { ring: string; icon: string; bg: string }> = {
  completed: { ring: "ring-success/20 border-success/40", icon: "text-success", bg: "bg-success/8" },
  active: { ring: "ring-primary/20 border-primary/40 shadow-sm shadow-primary/10", icon: "text-primary", bg: "bg-primary/8" },
  upcoming: { ring: "ring-border border-border", icon: "text-muted-foreground/50", bg: "bg-muted/40" },
};

export function StepCard({ icon: Icon, title, description, status, children, expandable, className }: StepCardProps) {
  const [expanded, setExpanded] = useState(status === "active");
  const s = statusStyles[status];

  return (
    <div
      className={cn(
        "rounded-xl border transition-premium",
        s.ring,
        status === "active" ? "bg-card" : "bg-card/60",
        className
      )}
    >
      <div
        className={cn("flex items-center gap-3 p-4", expandable && "cursor-pointer")}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-2", s.bg, s.ring)}>
          {status === "completed" ? <Check className="h-4 w-4 text-success" /> : <Icon className={cn("h-4 w-4", s.icon)} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", status === "upcoming" ? "text-muted-foreground" : "text-foreground")}>{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {expandable && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        )}
      </div>
      {children && expanded && (
        <div className="px-4 pb-4 pt-0 animate-fade-up">
          {children}
        </div>
      )}
    </div>
  );
}
