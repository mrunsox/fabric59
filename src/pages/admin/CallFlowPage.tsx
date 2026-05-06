import { CallFlowLegend } from "@/components/dev-guide/CallFlowLegend";
import { SwimlaneFlowchart, FlowPhase } from "@/components/dev-guide/CallLifecycleFlowchart";
import { CallFlowScenarioTabs } from "@/components/dev-guide/CallFlowScenarioTabs";
import { CallStateCounters } from "@/components/dev-guide/CallStateCounters";
import { Phone, Workflow, ListChecks, AlertTriangle, GitBranch as GitBranchIcon, Code2 } from "lucide-react";

const MASTER_PHASES: FlowPhase[] = [
  {
    id: "before",
    title: "Before Call",
    caption: "Setup, routing, lookup, preparation",
    steps: [
      {
        id: "b1", lane: "system", kind: "automated", required: true,
        label: "Inbound arrives or outbound initiated", note: "Five9 IVR / dialer event",
        impl: [
          { kind: "edge", name: "five9-main", detail: "Unified webhook entry from Five9" },
          { kind: "edge", name: "five9-webhook", detail: "Legacy webhook receiver" },
        ],
      },
      {
        id: "b2", lane: "system", kind: "automated", required: true,
        label: "Resolve workspace context", note: "workspace → partner → client",
        impl: [
          { kind: "lib", name: "src/lib/five9/resolveOwnership.ts", detail: "Maps Five9 domain → tenant" },
          { kind: "lib", name: "src/lib/config-merge.ts", detail: "Client > Partner > Org config inheritance" },
        ],
      },
      {
        id: "b3", lane: "system", kind: "automated", required: true,
        label: "Lookup caller / CRM record", note: "ANI lookup, prior interactions, identity_xrefs",
        impl: [
          { kind: "edge", name: "five9-main", detail: "Pre-call ANI lookup endpoint" },
          { kind: "table", name: "identity_xrefs" },
          { kind: "hook", name: "useCallLogs", detail: "Prior interactions" },
        ],
      },
      {
        id: "b4", lane: "system", kind: "decision", required: true,
        label: "Run queue / routing logic", note: "Skill, priority, callback policy",
        impl: [
          { kind: "edge", name: "five9-main", detail: "Routing dispatch" },
          { kind: "hook", name: "useQrDidMappings" },
        ],
      },
      {
        id: "b5", lane: "system", kind: "automated", required: true,
        label: "Assign agent + prepare screen pop",
        impl: [
          { kind: "hook", name: "useAgentPresence" },
          { kind: "edge", name: "five9-main", detail: "Sub-500ms screen pop payload" },
        ],
      },
      {
        id: "b6", lane: "agent", kind: "agent", required: false,
        label: "Review caller context pre-connect",
        impl: [{ kind: "component", name: "src/components/five9-overlay/" }],
      },
      {
        id: "b7", lane: "external", kind: "external", required: false,
        label: "Pull live CRM snapshot", note: "Clio / MyCase via five9-main",
        impl: [
          { kind: "edge", name: "clio" },
          { kind: "edge", name: "mycase" },
        ],
      },
    ],
  },
  {
    id: "during",
    title: "During Call",
    caption: "Live conversation + in-call updates",
    steps: [
      {
        id: "d1", lane: "system", kind: "automated", required: true,
        label: "Call connected — state: connected",
        impl: [
          { kind: "hook", name: "useCallSessionTracking" },
          { kind: "event", name: "call.connected" },
        ],
      },
      {
        id: "d2", lane: "system", kind: "automated", required: false,
        label: "Start recording / transcript", note: "If consent + config enabled",
        impl: [{ kind: "hook", name: "useCallSessionEvents" }],
      },
      {
        id: "d3", lane: "agent", kind: "agent", required: false,
        label: "Agent updates live notes / structured fields",
        impl: [{ kind: "component", name: "AgentCallNotesInput", detail: "Debounced autosave" }],
      },
      {
        id: "d4", lane: "agent", kind: "decision", required: false,
        label: "Branch: hold / transfer / escalate / book",
        impl: [{ kind: "component", name: "src/components/agent/" }],
      },
      {
        id: "d5", lane: "agent", kind: "agent", required: false,
        label: "Compliance prompt acknowledged",
        impl: [{ kind: "hook", name: "useScriptSessions" }],
      },
      {
        id: "d6", lane: "system", kind: "automated", required: true,
        label: "Live call ends — state: ended",
        impl: [
          { kind: "edge", name: "five9-main", detail: "callEnded webhook" },
          { kind: "event", name: "call.ended" },
        ],
      },
    ],
  },
  {
    id: "acw",
    title: "ACW (Wrap-up)",
    caption: "After live call ends, before final submit",
    steps: [
      {
        id: "a1", lane: "system", kind: "automated", required: true,
        label: "Enter ACW state — timer starts",
        impl: [{ kind: "hook", name: "useCallSessionTracking" }],
      },
      {
        id: "a2", lane: "system", kind: "automated", required: false,
        label: "Generate AI summary + action items", note: "Lovable AI gateway",
        impl: [
          { kind: "edge", name: "ai-suggestions" },
          { kind: "component", name: "PostCallSummary" },
        ],
      },
      {
        id: "a3", lane: "agent", kind: "agent", required: true,
        label: "Review / edit notes + summary",
        impl: [{ kind: "component", name: "AgentCallNotesInput" }],
      },
      {
        id: "a4", lane: "agent", kind: "agent", required: true,
        label: "Complete required structured fields",
        impl: [{ kind: "hook", name: "useCallSummaryTemplates" }],
      },
      {
        id: "a5", lane: "agent", kind: "agent", required: false,
        label: "Create callback / follow-up / internal task",
        impl: [
          { kind: "hook", name: "useCallbackReminders" },
          { kind: "hook", name: "useTasks" },
          { kind: "component", name: "CallbackRemindersPanel" },
        ],
      },
      {
        id: "a6", lane: "external", kind: "external", required: false,
        label: "Patch CRM contact / matter draft", note: "Optional in-ACW write",
        impl: [
          { kind: "edge", name: "five9-main", detail: "Best-effort draft write" },
          { kind: "lib", name: "supabase/functions/_shared/legal-crm-adapter.ts" },
        ],
      },
    ],
  },
  {
    id: "disp",
    title: "Disposition",
    caption: "Structured outcome submitted",
    steps: [
      {
        id: "p1", lane: "agent", kind: "agent", required: true,
        label: "Select disposition",
        impl: [{ kind: "hook", name: "useDispositions" }],
      },
      {
        id: "p2", lane: "system", kind: "decision", required: true,
        label: "Validate required disposition fields",
        impl: [{ kind: "lib", name: "supabase/functions/_shared/disposition-mapping-engine.ts" }],
      },
      {
        id: "p3", lane: "agent", kind: "agent", required: true,
        label: "Submit — wrap-up marked complete",
        impl: [{ kind: "hook", name: "useCallOutcomes" }],
      },
      {
        id: "p4", lane: "system", kind: "automated", required: true,
        label: "Persist disposition + close ACW",
        impl: [
          { kind: "table", name: "call_record" },
          { kind: "event", name: "disposition.committed" },
        ],
      },
    ],
  },
  {
    id: "post",
    title: "Post Disposition",
    caption: "Downstream automations + records",
    steps: [
      {
        id: "x1", lane: "system", kind: "automated", required: true,
        label: "Trigger automation pipeline",
        impl: [
          { kind: "edge", name: "process-jobs" },
          { kind: "hook", name: "usePostCallAutomations" },
        ],
      },
      {
        id: "x2", lane: "external", kind: "external", required: false,
        label: "Create / update ticket in CRM",
        impl: [
          { kind: "edge", name: "five9-main", detail: "Dispatcher" },
          { kind: "edge", name: "crm-push" },
          { kind: "edge", name: "clio" },
          { kind: "edge", name: "mycase" },
        ],
      },
      {
        id: "x3", lane: "external", kind: "external", required: false,
        label: "Fire outbound webhook (Zapier / Make)",
        impl: [{ kind: "edge", name: "send-notification" }],
      },
      {
        id: "x4", lane: "external", kind: "external", required: false,
        label: "Send SMS / email by disposition template",
        impl: [
          { kind: "edge", name: "twilio-sms" },
          { kind: "hook", name: "useEmailTemplates" },
        ],
      },
      {
        id: "x5", lane: "system", kind: "automated", required: true,
        label: "Record QA / analytics / compliance events",
        impl: [
          { kind: "hook", name: "useQAReviews" },
          { kind: "edge", name: "compliance-export" },
        ],
      },
      {
        id: "x6", lane: "system", kind: "automated", required: true,
        label: "Index for history + reporting",
        impl: [
          { kind: "edge", name: "five9-reporting" },
          { kind: "hook", name: "useCallLogs" },
        ],
      },
      {
        id: "x7", lane: "system", kind: "automated", required: false,
        label: "Schedule follow-up tasks / reminders",
        impl: [
          { kind: "hook", name: "useCallbackReminders" },
          { kind: "hook", name: "useScheduledReports" },
        ],
      },
    ],
  },
];

function SectionHeader({ icon: Icon, title, kicker }: { icon: typeof Phone; title: string; kicker?: string }) {
  return (
    <div className="mb-4">
      {kicker && <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{kicker}</div>}
      <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border/60 bg-card p-4 sm:p-5 ${className}`}>{children}</div>;
}

function Term({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/50 p-3">
      <div className="text-sm font-semibold text-foreground mb-0.5">{name}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export default function CallFlowPage() {
  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Platform Admin · Dev Reference</div>
        <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
          <Phone className="h-7 w-7 text-primary" /> Call Flow
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Canonical developer-facing lifecycle reference for call handling, ACW, disposition, and downstream automation.
          Prefer explicit visual state transitions and operational clarity over decorative UI — this page reads like a
          technical operations map for developers.
        </p>
      </header>

      {/* Concept clarification */}
      <section>
        <SectionHeader icon={Workflow} kicker="01" title="Concept clarification" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Term name="Before Call">Setup, routing, lookup, and preparation before the conversation is active.</Term>
          <Term name="During Call">Live conversation state and any in-call updates or actions.</Term>
          <Term name="ACW">
            <strong className="text-foreground">After-call wrap-up state</strong> after the live call ends — notes,
            structured fields, AI summary, tasks, and follow-up. ACW is <em>not</em> post-disposition automation.
          </Term>
          <Term name="Disposition">
            Structured outcome captured <em>within or at the end of</em> ACW. Final submit closes wrap-up.
          </Term>
          <Term name="Post Disposition">
            Downstream automations triggered <em>after</em> final submission — webhooks, CRM writes, QA, reporting.
          </Term>
        </div>
      </section>

      {/* Legend */}
      <section>
        <SectionHeader icon={ListChecks} kicker="02" title="Lifecycle legend" />
        <CallFlowLegend />
      </section>

      {/* Master flow */}
      <section>
        <SectionHeader icon={Workflow} kicker="03" title="Master lifecycle flow" />
        <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
          End-to-end swimlane view across <strong>System</strong>, <strong>Agent</strong>, and{" "}
          <strong>External Systems</strong>. Each phase corresponds to a distinct state transition; required steps must
          complete before the lifecycle can advance.
        </p>
        <SwimlaneFlowchart phases={MASTER_PHASES} />

        {/* Implementation ref legend */}
        <div className="mt-4 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Implementation refs</h3>
            <span className="text-xs text-muted-foreground">
              Each lifecycle step is tagged with the real Edge Function, hook, lib, table, or event that handles it.
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div><span className="font-mono uppercase opacity-60 mr-1">edge</span><span className="text-muted-foreground">Supabase Edge Function — <code>supabase/functions/&lt;name&gt;/index.ts</code></span></div>
            <div><span className="font-mono uppercase opacity-60 mr-1">hook</span><span className="text-muted-foreground">React hook — <code>src/hooks/&lt;name&gt;.ts</code></span></div>
            <div><span className="font-mono uppercase opacity-60 mr-1">lib</span><span className="text-muted-foreground">Shared module — typically <code>_shared/</code> or <code>src/lib/</code></span></div>
            <div><span className="font-mono uppercase opacity-60 mr-1">component</span><span className="text-muted-foreground">UI surface in <code>src/components/</code></span></div>
            <div><span className="font-mono uppercase opacity-60 mr-1">table</span><span className="text-muted-foreground">Database table updated at this step</span></div>
            <div><span className="font-mono uppercase opacity-60 mr-1">event</span><span className="text-muted-foreground">Internal event name dispatched on the bus</span></div>
          </div>
        </div>
      </section>

      {/* Scenario flows */}
      <section>
        <SectionHeader icon={GitBranchIcon} kicker="04" title="Scenario-specific flows" />
        <CallFlowScenarioTabs />
      </section>

      {/* State + write summary */}
      <section>
        <SectionHeader icon={ListChecks} kicker="05" title="State + write summary" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">State transitions</h3>
            <pre className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3 overflow-x-auto leading-relaxed">{`incoming → routing → connected → ended → acw → disposed → closed`}</pre>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              ACW only begins after <code>ended</code>. <code>disposed</code> is reached only after disposition validates
              and submits. Post-disposition automations run during the <code>disposed → closed</code> window.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">Records created or updated</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong className="text-foreground">call_record</strong> — created at routing, updated through every state</li>
              <li><strong className="text-foreground">notes / transcript / ai_summary</strong> — written during call + ACW</li>
              <li><strong className="text-foreground">disposition</strong> — committed only at final submit</li>
              <li><strong className="text-foreground">callback_reminders / tasks</strong> — created in ACW or post-disposition</li>
              <li><strong className="text-foreground">CRM contact / matter / ticket</strong> — patched via five9-main adapters</li>
              <li><strong className="text-foreground">analytics + qa_queue</strong> — indexed post-disposition only</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">Required to leave ACW</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>All <em>required</em> structured fields populated</li>
              <li>Notes confirmed (or AI summary acknowledged)</li>
              <li>Disposition selected and validated</li>
              <li>Callback / escalation owner assigned if scenario demands it</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">Only after final disposition</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Outbound webhook fires (Zapier / Make / customer endpoint)</li>
              <li>Email / SMS template sent based on disposition routing</li>
              <li>CRM ticket finalized + assignment notifications</li>
              <li>Reporting / abandon-rate / QA indexing</li>
              <li>Follow-up automation chains scheduled</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Implementation notes */}
      <section>
        <SectionHeader icon={AlertTriangle} kicker="06" title="Implementation notes" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">UI lock / unlock</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              During a live call the disposition form is <em>visible but disabled</em>. On <code>ended</code>, ACW
              unlocks fields. On submit, the entire wrap-up panel locks and only post-disposition status is shown.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">When ACW begins</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ACW begins the moment the telephony session reports <code>ended</code>, not when the agent clicks anything.
              The wrap-up timer is informational, not a deadline.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">Autosave vs confirm</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live notes autosave with debounce. Structured field changes autosave. Disposition selection requires an
              explicit confirm submit — never autosave a disposition.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-2">Automation triggers</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automations key off the <code>disposition.committed</code> event. Webhooks, ticket creation, and outbound
              messages must <strong>never</strong> fire from in-ACW edits.
            </p>
          </Card>
          <Card className="md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">External system updates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All CRM writes route through the unified <code>five9-main</code> edge function which dispatches to
              Clio / MyCase / etc. adapters. In-ACW writes are best-effort drafts; the canonical post-disposition
              dispatch is the source of truth for downstream sync. Idempotency is enforced via{" "}
              <code>callId + tenantId + disposition</code>.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

