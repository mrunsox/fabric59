import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Milestone {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface OnboardingMilestonesProps {
  milestones: Milestone[];
  currentIndex: number;
  className?: string;
}

export function OnboardingMilestones({ milestones, currentIndex, className }: OnboardingMilestonesProps) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {milestones.map((m, i) => {
        const completed = i < currentIndex;
        const active = i === currentIndex;
        const Icon = m.icon;

        return (
          <div key={m.key} className="flex items-start gap-3 relative">
            {/* Vertical line */}
            {i < milestones.length - 1 && (
              <div
                className={cn(
                  "absolute left-[15px] top-[36px] w-0.5 h-[calc(100%-4px)]",
                  completed ? "bg-success/50" : "bg-border"
                )}
              />
            )}

            {/* Circle */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                completed
                  ? "border-success bg-success/15 text-success"
                  : active
                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                  : "border-border bg-muted text-muted-foreground/50"
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
            </div>

            {/* Content */}
            <div className={cn("pb-6 min-w-0", active ? "opacity-100" : "opacity-60")}>
              <p className={cn("text-sm font-semibold", active ? "text-foreground" : "text-foreground/70")}>
                {m.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.description}</p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
