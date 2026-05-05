import {
  PhoneIncoming,
  LayoutTemplate,
  Workflow,
  Target,
  Plug,
  Activity,
  CheckCircle2,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

interface Lane {
  icon: LucideIcon;
  name: string;
  caption: string;
  chips: string[];
  fanIn?: string;
}

const LANES: Lane[] = [
  {
    icon: PhoneIncoming,
    name: "Five9 event source",
    caption: "Telephony events that originate every flow",
    chips: ["On Call Dispositioned", "On Call Ended", "Callback Requested", "Inbound ANI Lookup"],
  },
  {
    icon: LayoutTemplate,
    name: "Flow Template",
    caption: "Reusable blueprint chosen by the admin",
    chips: ["Disposition Webhook", "CRM Action", "Inbound Lookup", "Callback / Task", "Custom Relay"],
  },
  {
    icon: Workflow,
    name: "Configured Flow",
    caption: "Template + admin configuration in the FlowBuilder",
    chips: ["Trigger", "Filters", "Mappings", "Action", "Failure Policy", "Test / Review"],
  },
  {
    icon: Target,
    name: "Deployment Scope",
    caption: "Where and when the flow is allowed to fire",
    chips: ["Workspace", "Client", "Five9 Domain", "Campaign", "Queue", "Disposition Conditions"],
  },
  {
    icon: Plug,
    name: "Connector Layer",
    caption: "Reusable systems the flow can act against",
    chips: ["Clio", "MyCase", "Smokeball", "Webhook", "Custom HTTP", "Future Connectors"],
    fanIn: "Deployment scope + Connector resolve at run time",
  },
  {
    icon: Activity,
    name: "Execution Run",
    caption: "Per-event invocation tracked end to end",
    chips: ["Request Payload", "Response Payload", "Success / Failure", "Retry / Replay", "Idempotency / External Record"],
  },
  {
    icon: CheckCircle2,
    name: "Target Outcomes",
    caption: "What the connector ultimately did downstream",
    chips: [
      "Create / Update Contact",
      "Create Matter / Case",
      "Create Task",
      "Create Note / Activity",
      "Return Screen-Pop Context",
      "Send Webhook Payload",
    ],
  },
];

export function ArchitectureFlowchart() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-4 sm:p-6 overflow-x-auto">
      <div className="min-w-[640px] space-y-0">
        {LANES.map((lane, i) => {
          const Icon = lane.icon;
          return (
            <div key={lane.name}>
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">{lane.name}</div>
                    <div className="text-xs text-muted-foreground">{lane.caption}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lane.chips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs border border-border/60 bg-secondary/40 text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {i < LANES.length - 1 && (
                <div className="flex flex-col items-center py-2">
                  <div className="w-px h-6 bg-border" />
                  <ChevronDown className="h-4 w-4 text-primary -mt-1" />
                  {lane.fanIn && (
                    <div className="text-[11px] text-muted-foreground mt-1">{lane.fanIn}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span><span className="text-primary">▼</span> directional flow</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-secondary border border-border/60 align-middle mr-1" /> entity / value</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-background border border-border/60 align-middle mr-1" /> system layer</span>
      </div>
    </div>
  );
}
