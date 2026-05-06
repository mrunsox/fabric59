import { Bot, User, Plug, GitBranch, Asterisk, CircleDashed } from "lucide-react";

type LegendItem = {
  label: string;
  description: string;
  icon: typeof Bot;
  className: string;
};

const ITEMS: LegendItem[] = [
  {
    label: "Required",
    description: "Must complete to advance lifecycle",
    icon: Asterisk,
    className: "bg-primary/10 text-primary border-primary/30",
  },
  {
    label: "Optional",
    description: "Conditional on scenario / config",
    icon: CircleDashed,
    className: "bg-muted text-muted-foreground border-border",
  },
  {
    label: "Automated",
    description: "System / platform performs the action",
    icon: Bot,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  {
    label: "Agent",
    description: "Manual action by the human agent",
    icon: User,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    label: "External sync",
    description: "Outbound write to CRM / ticketing / webhook",
    icon: Plug,
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  },
  {
    label: "Decision",
    description: "Branching logic — outcome determines next step",
    icon: GitBranch,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
];

export function CallFlowLegend() {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">Lifecycle legend</h3>
        <span className="text-xs text-muted-foreground">Visual conventions used across every flowchart</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 rounded-md border border-border/40 bg-background/50 p-2.5">
              <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border ${item.className}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground leading-tight">{item.label}</div>
                <div className="text-xs text-muted-foreground leading-snug">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
