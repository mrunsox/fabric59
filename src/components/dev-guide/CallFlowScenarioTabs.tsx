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

function DeviationBadge({ count, total }: { count: number; total: number }) {
  if (total === 0) {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        no data
      </span>
    );
  }
  if (count === 0) {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" /> 0/{total}
      </span>
    );
  }
  const pct = Math.round((count / total) * 100);
  const tone = pct >= 20
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return (
    <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      <AlertTriangle className="h-2.5 w-2.5" /> {count}/{total} deviated
    </span>
  );
}

export function CallFlowScenarioTabs() {
  const [active, setActive] = useState<ScenarioId>(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === active)!;
  const { data: deviations, loading, error, updatedAt } = useScenarioDeviations(24);
  const current = deviations[active];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        {SCENARIOS.map((s) => {
          const d = deviations[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                active === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
              )}
            >
              {s.label}
              <DeviationBadge count={d.deviations} total={d.total} />
            </button>
          );
        })}
      </div>
      <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{scenario.label}: </span>
        {scenario.summary}
      </div>

      {/* Deviation panel */}
      <div className="rounded-md border border-border/60 bg-card p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-semibold text-foreground">Workflow deviations (last 24h)</h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {loading ? "Refreshing…" : updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : ""}
          </span>
        </div>
        {error && (
          <div className="text-xs text-destructive">{error}</div>
        )}
        {!error && current.total === 0 && (
          <div className="text-xs text-muted-foreground">No sessions classified as <strong className="text-foreground">{scenario.label}</strong> in this window.</div>
        )}
        {!error && current.total > 0 && current.deviations === 0 && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
            All {current.total} sessions completed required steps. No branching deviations detected.
          </div>
        )}
        {!error && current.deviations > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{current.deviations}</span> of{" "}
              <span className="text-foreground font-semibold">{current.total}</span> sessions deviated from the expected flow.
            </div>
            <ul className="space-y-1">
              {current.reasons.map((r) => (
                <li key={r.reason} className="flex items-center justify-between text-xs">
                  <code className="text-foreground/90">{r.reason}</code>
                  <span className="font-mono text-muted-foreground tabular-nums">×{r.count}</span>
                </li>
              ))}
            </ul>
            {current.sampleSessions.length > 0 && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                Sample sessions:{" "}
                {current.sampleSessions.map((id) => (
                  <code key={id} className="ml-1 text-[10px]">{id.slice(0, 8)}</code>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SwimlaneFlowchart phases={scenario.phases} />
    </div>
  );
}
}
