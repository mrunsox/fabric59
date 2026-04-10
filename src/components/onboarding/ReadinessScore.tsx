import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";

interface ReadinessItem {
  label: string;
  complete: boolean;
}

interface ReadinessScoreProps {
  score: number;
  items: ReadinessItem[];
  blockers?: string[];
  className?: string;
}

export function ReadinessScore({ score, items, blockers = [], className }: ReadinessScoreProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Circular progress */}
      <div className="flex items-center justify-center">
        <div className="relative h-28 w-28">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={score >= 80 ? "hsl(var(--success))" : score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{score}%</span>
            <span className="text-[10px] text-muted-foreground">Ready</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <div className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0",
              item.complete ? "bg-success/15" : "bg-muted/50"
            )}>
              {item.complete ? <Check className="h-3 w-3 text-success" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />}
            </div>
            <span className={cn(item.complete ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-1.5">
          <p className="text-xs font-medium text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Blockers
          </p>
          {blockers.map((b, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">• {b}</p>
          ))}
        </div>
      )}
    </div>
  );
}
