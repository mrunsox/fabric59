import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  change?: string;
}

interface MetricStripProps {
  items: MetricItem[];
  className?: string;
}

export function MetricStrip({ items, className }: MetricStripProps) {
  return (
    <div className={cn("flex items-center gap-6 rounded-lg surface-inset px-5 py-3 overflow-x-auto", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5 min-w-0">
          {item.icon && <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">{item.value}</span>
            <span className="text-caption whitespace-nowrap">{item.label}</span>
          </div>
          {item.change && (
            <span className="text-[10px] font-medium text-success whitespace-nowrap">{item.change}</span>
          )}
          {i < items.length - 1 && <div className="h-4 w-px bg-border/50 ml-4 flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}
