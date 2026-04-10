import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ReactNode } from "react";

type Tier = "hero" | "standard" | "compact";
type Variant = "default" | "primary" | "success" | "warning" | "destructive";

interface PremiumStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tier?: Tier;
  variant?: Variant;
  trend?: { value: number; label?: string };
  sparkline?: ReactNode;
  className?: string;
}

const accentColors: Record<Variant, string> = {
  default: "border-t-border/60",
  primary: "border-t-primary/50",
  success: "border-t-success/50",
  warning: "border-t-warning/50",
  destructive: "border-t-destructive/50",
};

const iconBg: Record<Variant, string> = {
  default: "bg-muted/60 text-muted-foreground",
  primary: "bg-primary/8 text-primary",
  success: "bg-success/8 text-success",
  warning: "bg-warning/8 text-warning",
  destructive: "bg-destructive/8 text-destructive",
};

const trendColor = (v: number) =>
  v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground";

const TrendIcon = ({ value }: { value: number }) =>
  value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />;

export function PremiumStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tier = "standard",
  variant = "default",
  trend,
  sparkline,
  className,
}: PremiumStatCardProps) {
  if (tier === "compact") {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-premium", className)}>
        {Icon && (
          <div className={cn("rounded-lg p-1.5", iconBg[variant])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-caption truncate">{title}</p>
          <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor(trend.value))}>
            <TrendIcon value={trend.value} />
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    );
  }

  const isHero = tier === "hero";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-premium",
        isHero ? "border-t-[3px] p-6 col-span-2" : "border-t-2 p-5",
        accentColors[variant],
        "hover:shadow-md hover:shadow-black/3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-muted-foreground", isHero ? "text-sm" : "text-xs")}>{title}</p>
          <p className={cn("font-bold tracking-tight text-foreground mt-1.5", isHero ? "text-4xl" : "text-3xl")}>{value}</p>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={cn("mt-2.5 flex items-center gap-1 text-xs font-medium", trendColor(trend.value))}>
              <TrendIcon value={trend.value} />
              <span>{trend.value > 0 ? "+" : ""}{trend.value}%</span>
              {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-xl flex-shrink-0", isHero ? "p-3" : "p-2.5", iconBg[variant])}>
            <Icon className={cn(isHero ? "h-5 w-5" : "h-4 w-4")} />
          </div>
        )}
      </div>
      {sparkline && <div className="mt-4">{sparkline}</div>}
    </div>
  );
}
