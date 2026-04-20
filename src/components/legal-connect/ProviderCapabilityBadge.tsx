import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, HandHelping, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type Mode = "native" | "conditional" | "manual_only" | "unsupported";

const MAP: Record<Mode, { label: string; icon: any; classes: string; tooltip: string }> = {
  native: {
    label: "Supported",
    icon: CheckCircle2,
    classes: "bg-success/15 text-success border-success/30",
    tooltip: "Provider natively supports this action.",
  },
  conditional: {
    label: "Conditional",
    icon: AlertCircle,
    classes: "bg-warning/15 text-warning border-warning/30",
    tooltip: "Supported in some accounts/tiers. May need elevated access.",
  },
  manual_only: {
    label: "Manual",
    icon: HandHelping,
    classes: "bg-accent text-accent-foreground border-border",
    tooltip: "Routes to the review queue for manual completion.",
  },
  unsupported: {
    label: "Unsupported",
    icon: XCircle,
    classes: "bg-destructive/15 text-destructive border-destructive/30",
    tooltip: "Provider does not expose this action.",
  },
};

interface Props {
  mode: Mode | string;
  size?: "sm" | "md";
  notes?: string | null;
}

export default function ProviderCapabilityBadge({ mode, size = "sm", notes }: Props) {
  const m = MAP[(mode as Mode)] ?? MAP.unsupported;
  const Icon = m.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${size === "sm" ? "text-xs" : "text-sm"} ${m.classes}`}>
            <Icon className="h-3 w-3" />
            {m.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div>{m.tooltip}</div>
          {notes && <div className="mt-1 text-xs text-muted-foreground">{notes}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
