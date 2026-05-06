import { useState } from "react";
import { SwimlaneFlowchart, FlowPhase } from "./CallLifecycleFlowchart";
import { cn } from "@/lib/utils";
import { useScenarioDeviations, type ScenarioId } from "@/hooks/useScenarioDeviations";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Scenario {
  id: ScenarioId;
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
        id: "before", title: "Before Call",
        steps: [
          { id: "r1", lane: "system", kind: "automated", required: true, label: "Route inbound to skill / agent", impl: [{ kind: "edge", name: "five9-main" }] },
          { id: "r2", lane: "system", kind: "automated", required: true, label: "ANI lookup → CRM screen pop", impl: [{ kind: "edge", name: "five9-main", detail: "ANI lookup" }, { kind: "table", name: "identity_xrefs" }] },
        ],
      },
      {
        id: "during", title: "During Call",
        steps: [
          { id: "r3", lane: "agent", kind: "agent", required: true, label: "Resolve issue with caller" },
          { id: "r4", lane: "agent", kind: "agent", required: false, label: "Update live notes / structured fields", impl: [{ kind: "component", name: "AgentCallNotesInput" }] },
        ],
      },
      {
        id: "acw", title: "ACW",
        steps: [
          { id: "r5", lane: "system", kind: "automated", required: false, label: "Generate AI summary from transcript", impl: [{ kind: "edge", name: "ai-suggestions" }] },
          { id: "r6", lane: "agent", kind: "agent", required: true, label: "Confirm summary, complete required fields", impl: [{ kind: "hook", name: "useCallSummaryTemplates" }] },
        ],
      },
      {
        id: "disp", title: "Disposition",
        steps: [
          { id: "r7", lane: "agent", kind: "agent", required: true, label: "Select disposition = Resolved", impl: [{ kind: "hook", name: "useDispositions" }] },
          { id: "r8", lane: "system", kind: "automated", required: true, label: "Validate + commit disposition", impl: [{ kind: "lib", name: "_shared/disposition-mapping-engine.ts" }, { kind: "event", name: "disposition.committed" }] },
        ],
      },
      {
        id: "post", title: "Post Disposition",
        steps: [
          { id: "r9", lane: "external", kind: "external", required: false, label: "Patch CRM contact / matter notes", impl: [{ kind: "edge", name: "crm-push" }, { kind: "edge", name: "clio" }] },
          { id: "r10", lane: "system", kind: "automated", required: true, label: "Index for reporting + QA queue", impl: [{ kind: "edge", name: "five9-reporting" }, { kind: "hook", name: "useQAReviews" }] },
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
        id: "before", title: "Before Call",
        steps: [{ id: "c1", lane: "system", kind: "automated", required: true, label: "Route inbound, screen pop", impl: [{ kind: "edge", name: "five9-main" }] }],
      },
      {
        id: "during", title: "During Call",
        steps: [
          { id: "c2", lane: "agent", kind: "agent", required: true, label: "Confirm caller wants callback" },
          { id: "c3", lane: "agent", kind: "agent", required: true, label: "Capture preferred time + reason", impl: [{ kind: "hook", name: "useCallbackReminders" }] },
        ],
      },
      {
        id: "acw", title: "ACW",
        steps: [
          { id: "c4", lane: "agent", kind: "agent", required: true, label: "Create callback task with timestamp + owner", impl: [{ kind: "hook", name: "useCallbackReminders" }, { kind: "component", name: "CallbackRemindersPanel" }] },
          { id: "c5", lane: "agent", kind: "agent", required: true, label: "Complete required notes", impl: [{ kind: "component", name: "AgentCallNotesInput" }] },
        ],
      },
      {
        id: "disp", title: "Disposition",
        steps: [
          { id: "c6", lane: "agent", kind: "decision", required: true, label: "Disposition = Callback / Pending follow-up", impl: [{ kind: "hook", name: "useDispositions" }] },
          { id: "c7", lane: "system", kind: "automated", required: true, label: "Validate callback fields populated", impl: [{ kind: "lib", name: "_shared/disposition-mapping-engine.ts" }] },
        ],
      },
      {
        id: "post", title: "Post Disposition",
        steps: [
          { id: "c8", lane: "system", kind: "automated", required: true, label: "Schedule callback reminder", impl: [{ kind: "edge", name: "process-jobs" }, { kind: "hook", name: "useCallbackReminders" }] },
          { id: "c9", lane: "external", kind: "external", required: false, label: "Send SMS / email confirmation to caller", impl: [{ kind: "edge", name: "twilio-sms" }, { kind: "edge", name: "send-notification" }] },
          { id: "c10", lane: "external", kind: "external", required: false, label: "Create CRM task assigned to owner", impl: [{ kind: "edge", name: "crm-push" }] },
        ],
      },
    ],
  },
  {
    id: "escalation",
    label: "Escalation Required",
    summary: "Handoff to manager / specialist team. Internal ticket created. Owner queue notified post-disposition.",
    phases: [
      { id: "before", title: "Before Call", steps: [{ id: "e1", lane: "system", kind: "automated", required: true, label: "Route + screen pop", impl: [{ kind: "edge", name: "five9-main" }] }] },
      {
        id: "during", title: "During Call",
        steps: [
          { id: "e2", lane: "agent", kind: "decision", required: true, label: "Identify escalation trigger" },
          { id: "e3", lane: "agent", kind: "agent", required: false, label: "Warm transfer or schedule handoff" },
        ],
      },
      {
        id: "acw", title: "ACW",
        steps: [
          { id: "e4", lane: "agent", kind: "agent", required: true, label: "Document escalation reason + context", impl: [{ kind: "component", name: "AgentCallNotesInput" }] },
          { id: "e5", lane: "agent", kind: "agent", required: true, label: "Assign target team / owner", impl: [{ kind: "hook", name: "useTeamPermissions" }] },
        ],
      },
      {
        id: "disp", title: "Disposition",
        steps: [
          { id: "e6", lane: "agent", kind: "agent", required: true, label: "Disposition = Escalated", impl: [{ kind: "hook", name: "useDispositions" }] },
          { id: "e7", lane: "system", kind: "automated", required: true, label: "Validate assignee present", impl: [{ kind: "lib", name: "_shared/disposition-mapping-engine.ts" }] },
        ],
      },
      {
        id: "post", title: "Post Disposition",
        steps: [
          { id: "e8", lane: "external", kind: "external", required: true, label: "Create / update ticket in CRM", impl: [{ kind: "edge", name: "crm-push" }, { kind: "edge", name: "clio" }, { kind: "edge", name: "mycase" }] },
          { id: "e9", lane: "external", kind: "external", required: true, label: "Notify owner queue (Slack / email)", impl: [{ kind: "edge", name: "slack-agent" }, { kind: "edge", name: "send-notification" }] },
          { id: "e10", lane: "system", kind: "automated", required: true, label: "Tag for QA review", impl: [{ kind: "hook", name: "useQAReviews" }] },
        ],
      },
    ],
  },
  {
    id: "failed",
    label: "Failed / Partial Interaction",
    summary: "Abandoned, dropped, voicemail, no-answer, or failed transfer. Reduced ACW path with limited required fields.",
    phases: [
      { id: "before", title: "Before Call", steps: [{ id: "f1", lane: "system", kind: "automated", required: true, label: "Route attempted", impl: [{ kind: "edge", name: "five9-main" }] }] },
      {
        id: "during", title: "During Call",
        steps: [
          { id: "f2", lane: "system", kind: "decision", required: true, label: "Outcome: abandoned / dropped / VM / no-answer", impl: [{ kind: "edge", name: "five9-main" }, { kind: "event", name: "call.ended" }] },
          { id: "f3", lane: "system", kind: "automated", required: false, label: "Capture short transcript / VM if applicable", impl: [{ kind: "hook", name: "useCallSessionEvents" }] },
        ],
      },
      {
        id: "acw", title: "ACW",
        steps: [
          { id: "f4", lane: "system", kind: "automated", required: true, label: "Auto-enter reduced ACW", impl: [{ kind: "hook", name: "useCallSessionTracking" }] },
          { id: "f5", lane: "agent", kind: "agent", required: false, label: "Annotate if reachable / retry desired", impl: [{ kind: "component", name: "AgentCallNotesInput" }] },
        ],
      },
      {
        id: "disp", title: "Disposition",
        steps: [
          { id: "f6", lane: "agent", kind: "decision", required: true, label: "Disposition = Abandoned / VM / Failed", impl: [{ kind: "hook", name: "useDispositions" }] },
          { id: "f7", lane: "system", kind: "automated", required: true, label: "Auto-set if no agent connect", impl: [{ kind: "lib", name: "_shared/disposition-mapping-engine.ts" }] },
        ],
      },
      {
        id: "post", title: "Post Disposition",
        steps: [
          { id: "f8", lane: "system", kind: "automated", required: false, label: "Schedule retry attempt (policy-driven)", impl: [{ kind: "edge", name: "process-jobs" }] },
          { id: "f9", lane: "system", kind: "automated", required: true, label: "Index for abandon-rate analytics", impl: [{ kind: "edge", name: "five9-reporting" }] },
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
