import { cn } from "@/lib/utils";
import { Sparkles, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIRecommendationCardProps {
  title: string;
  reasoning: string;
  onAccept?: () => void;
  onCustomize?: () => void;
  accepted?: boolean;
  className?: string;
}

export function AIRecommendationCard({
  title, reasoning, onAccept, onCustomize, accepted, className,
}: AIRecommendationCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-premium animate-fade-up",
      accepted ? "border-success/20 bg-success/3" : "border-primary/15 bg-primary/3",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
          accepted ? "bg-success/10" : "bg-primary/10"
        )}>
          {accepted ? <Check className="h-4 w-4 text-success" /> : <Sparkles className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{reasoning}</p>
          {!accepted && (onAccept || onCustomize) && (
            <div className="flex items-center gap-2 mt-3">
              {onAccept && (
                <Button size="sm" onClick={onAccept} className="h-7 text-xs">
                  <Check className="h-3 w-3 mr-1" /> Accept
                </Button>
              )}
              {onCustomize && (
                <Button size="sm" variant="outline" onClick={onCustomize} className="h-7 text-xs">
                  <Settings2 className="h-3 w-3 mr-1" /> Customize
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
