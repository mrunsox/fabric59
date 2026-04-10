import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

interface OnboardingContextHelperProps {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

export function OnboardingContextHelper({ title, description, children, className }: OnboardingContextHelperProps) {
  return (
    <div className={cn("rounded-xl border border-primary/15 bg-primary/3 p-4 animate-slide-in-right", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
