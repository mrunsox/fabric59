import { useState } from "react";
import { SwimlaneFlowchart, FlowPhase } from "./CallLifecycleFlowchart";
import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  label: string;
  summary: string;
  phases: FlowPhase[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "resolved",
    label: "Resolved on Call",
    summary: "Issue handled live. Brief ACW, single disposition submit, optional CRM/QA writes.",
    phases: [
      {
        id: "before",
        title: "Before Call",
        steps: [
          { id: "r1", lane: "system", kind: "automated", required: true, label: "Route inbound to skill / agent" },
          { id: "r2", lane: "system", kind: "automated", required: true, label: "ANI lookup → CRM screen pop" },
        ],
      },
      {
        id: "during",
        title: "During Call",
        steps: [
          { id: "r3", lane: "agent", kind: "agent", required: true, label: "Resolve issue with caller" },
          { id: "r4", lane: "agent", kind: "agent", required: false, label: "Update live notes / structured fields" },
        ],
      },
      {
        id: "acw",
        title: "ACW",
        steps: [
          { id: "r5", lane: "system", kind: "automated", required: false, label: "Generate AI summary from transcript" },
          { id: "r6", lane: "agent", kind: "agent", required: true, label: "Confirm summary, complete required fields" },
        ],
      },
      {
        id: "disp",
        title: "Disposition",
        steps: [
          { id: "r7", lane: "agent", kind: "agent", required: true, label: "Select disposition = Resolved" },
          { id: "r8", lane: "system", kind: "automated", required: true, label: "Validate + commit disposition" },
        ],
      },
      {
        id: "post",
        title: "Post Disposition",
        steps: [
          { id: "r9", lane: "external", kind: "external", required: false, label: "Patch CRM contact / matter notes" },
          { id: "r10", lane: "system", kind: "automated", required: true, label: "Index for reporting + QA queue" },
        ],
      },
    ],
  },
  {
    id: "callback",
    label: "Callback Required",
    summary: "Live call did not fully resolve. Callback task created and scheduled. Optional customer confirmation sent.",
    phases: [
      {
        id: "before",
        title: "Before Call",
        steps: [
          { id: "c1", lane: "system", kind: "automated", required: true, label: "Route inbound, screen pop" },
        ],
      },
      {
        id: "during",
        title: "During Call",
        steps: [
          { id: "c2", lane: "agent", kind: "agent", required: true, label: "Confirm caller wants callback" },
          { id: "c3", lane: "agent", kind: "agent", required: true, label: "Capture preferred time + reason" },
        ],
      },
      {
        id: "acw",
        title: "ACW",
        steps: [
          { id: "c4", lane: "agent", kind: "agent", required: true, label: "Create callback task with timestamp + owner" },
          { id: "c5", lane: "agent", kind: "agent", required: true, label: "Complete required notes" },
        ],
      },
      {
        id: "disp",
        title: "Disposition",
        steps: [
          { id: "c6", lane: "agent", kind: "decision", required: true, label: "Disposition = Callback / Pending follow-up" },
          { id: "c7", lane: "system", kind: "automated", required: true, label: "Validate callback fields populated" },
        ],
      },
      {
        id: "post",
        title: "Post Disposition",
        steps: [
          { id: "c8", lane: "system", kind: "automated", required: true, label: "Schedule callback reminder" },
          { id: "c9", lane: "external", kind: "external", required: false, label: "Send SMS / email confirmation to caller" },
          { id: "c10", lane: "external", kind: "external", required: false, label: "Create CRM task assigned to owner" },
        ],
      },
    ],
  },
  {
    id: "escalation",
    label: "Escalation Required",
    summary: "Handoff to manager / specialist team. Internal ticket created. Owner queue notified post-disposition.",
    phases: [
      {
        id: "before",
        title: "Before Call",
        steps: [
          { id: "e1", lane: "system", kind: "automated", required: true, label: "Route + screen pop" },
        ],
      },
      {
        id: "during",
        title: "During Call",
        steps: [
          { id: "e2", lane: "agent", kind: "decision", required: true, label: "Identify escalation trigger" },
          { id: "e3", lane: "agent", kind: "agent", required: false, label: "Warm transfer or schedule handoff" },
        ],
      },
      {
        id: "acw",
        title: "ACW",
        steps: [
          { id: "e4", lane: "agent", kind: "agent", required: true, label: "Document escalation reason + context" },
          { id: "e5", lane: "agent", kind: "agent", required: true, label: "Assign target team / owner" },
        ],
      },
      {
        id: "disp",
        title: "Disposition",
        steps: [
          { id: "e6", lane: "agent", kind: "agent", required: true, label: "Disposition = Escalated" },
          { id: "e7", lane: "system", kind: "automated", required: true, label: "Validate assignee present" },
        ],
      },
      {
        id: "post",
        title: "Post Disposition",
        steps: [
          { id: "e8", lane: "external", kind: "external", required: true, label: "Create / update ticket in CRM" },
          { id: "e9", lane: "external", kind: "external", required: true, label: "Notify owner queue (Slack / email)" },
          { id: "e10", lane: "system", kind: "automated", required: true, label: "Tag for QA review" },
        ],
      },
    ],
  },
  {
    id: "failed",
    label: "Failed / Partial Interaction",
    summary: "Abandoned, dropped, voicemail, no-answer, or failed transfer. Reduced ACW path with limited required fields.",
    phases: [
      {
        id: "before",
        title: "Before Call",
        steps: [
          { id: "f1", lane: "system", kind: "automated", required: true, label: "Route attempted" },
        ],
      },
      {
        id: "during",
        title: "During Call",
        steps: [
          { id: "f2", lane: "system", kind: "decision", required: true, label: "Outcome: abandoned / dropped / VM / no-answer" },
          { id: "f3", lane: "system", kind: "automated", required: false, label: "Capture short transcript / VM if applicable" },
        ],
      },
      {
        id: "acw",
        title: "ACW",
        steps: [
          { id: "f4", lane: "system", kind: "automated", required: true, label: "Auto-enter reduced ACW" },
          { id: "f5", lane: "agent", kind: "agent", required: false, label: "Annotate if reachable / retry desired" },
        ],
      },
      {
        id: "disp",
        title: "Disposition",
        steps: [
          { id: "f6", lane: "agent", kind: "decision", required: true, label: "Disposition = Abandoned / VM / Failed" },
          { id: "f7", lane: "system", kind: "automated", required: true, label: "Auto-set if no agent connect" },
        ],
      },
      {
        id: "post",
        title: "Post Disposition",
        steps: [
          { id: "f8", lane: "system", kind: "automated", required: false, label: "Schedule retry attempt (policy-driven)" },
          { id: "f9", lane: "system", kind: "automated", required: true, label: "Index for abandon-rate analytics" },
        ],
      },
    ],
  },
];

export function CallFlowScenarioTabs() {
  const [active, setActive] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === active)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
              active === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{scenario.label}: </span>
        {scenario.summary}
      </div>
      <SwimlaneFlowchart phases={scenario.phases} />
    </div>
  );
}
