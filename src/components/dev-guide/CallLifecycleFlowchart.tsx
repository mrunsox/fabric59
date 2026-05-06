import { forwardRef } from "react";
import { Bot, User, Plug, GitBranch, Asterisk, CircleDashed, ChevronRight, Code2 } from "lucide-react";

export type ActorKind = "system" | "agent" | "external" | "customer";
export type StepKind = "automated" | "agent" | "external" | "decision";

export type ImplKind = "edge" | "hook" | "lib" | "component" | "table" | "event";

export interface ImplRef {
  kind: ImplKind;
  /** e.g. "five9-main", "useCallSessionTracking", "supabase/functions/_shared/disposition-mapping-engine.ts" */
  name: string;
  /** Short human label of what this ref does in the step. */
  detail?: string;
}

export interface FlowStep {
  id: string;
  label: string;
  lane: ActorKind;
  kind: StepKind;
  required?: boolean;
  note?: string;
  /** Implementation refs so devs can trace this step to real code. */
  impl?: ImplRef[];
}

export interface FlowPhase {
  id: string;
  title: string;
  caption?: string;
  steps: FlowStep[];
}

const LANE_META: Record<ActorKind, { label: string; tone: string }> = {
  system: { label: "System", tone: "border-sky-500/30 bg-sky-500/5" },
  agent: { label: "Agent", tone: "border-emerald-500/30 bg-emerald-500/5" },
  external: { label: "External Systems", tone: "border-violet-500/30 bg-violet-500/5" },
  customer: { label: "Customer / Caller", tone: "border-amber-500/30 bg-amber-500/5" },
};

const KIND_META: Record<StepKind, { icon: typeof Bot; chip: string }> = {
  automated: { icon: Bot, chip: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30" },
  agent: { icon: User, chip: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  external: { icon: Plug, chip: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/30" },
  decision: { icon: GitBranch, chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" },
};

interface SwimlaneFlowchartProps {
  phases: FlowPhase[];
  lanes?: ActorKind[];
}

export function SwimlaneFlowchart({
  phases,
  lanes = ["system", "agent", "external"],
}: SwimlaneFlowchartProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {/* Phase headers */}
      <div
        className="grid border-b border-border/60 bg-muted/30"
        style={{ gridTemplateColumns: `140px repeat(${phases.length}, minmax(220px, 1fr))` }}
      >
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lane / Phase
        </div>
        {phases.map((p, i) => (
          <div key={p.id} className="px-3 py-2 border-l border-border/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-foreground">{p.title}</span>
            </div>
            {p.caption && <div className="text-[11px] text-muted-foreground mt-0.5">{p.caption}</div>}
          </div>
        ))}
      </div>

      {/* Lanes */}
      {lanes.map((lane) => (
        <div
          key={lane}
          className="grid border-b border-border/60 last:border-b-0"
          style={{ gridTemplateColumns: `140px repeat(${phases.length}, minmax(220px, 1fr))` }}
        >
          <div className={`px-3 py-3 border-r border-border/60 ${LANE_META[lane].tone} flex items-center`}>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {LANE_META[lane].label}
            </div>
          </div>
          {phases.map((phase) => {
            const steps = phase.steps.filter((s) => s.lane === lane);
            return (
              <div key={phase.id} className="px-3 py-3 border-l border-border/40 space-y-2">
                {steps.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/50 italic">—</div>
                ) : (
                  steps.map((step, idx) => {
                    const KindIcon = KIND_META[step.kind].icon;
                    return (
                      <div key={step.id}>
                        <div className="rounded-md border border-border/60 bg-background p-2.5 hover:border-primary/40 transition-colors">
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${KIND_META[step.kind].chip}`}
                              title={step.kind}
                            >
                              <KindIcon className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-foreground leading-snug">
                                {step.label}
                                {step.required ? (
                                  <Asterisk className="inline h-3 w-3 ml-1 text-primary" aria-label="required" />
                                ) : (
                                  <CircleDashed className="inline h-3 w-3 ml-1 text-muted-foreground" aria-label="optional" />
                                )}
                              </div>
                              {step.note && (
                                <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">
                                  {step.note}
                                </div>
                              )}
                              {step.impl && step.impl.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {step.impl.map((ref, i) => (
                                    <span
                                      key={i}
                                      title={ref.detail ?? ref.kind}
                                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9.5px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40"
                                    >
                                      <Code2 className="h-2.5 w-2.5" />
                                      <span className="text-[8.5px] uppercase tracking-wider opacity-60">{ref.kind}</span>
                                      <span className="text-foreground/80">{ref.name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="flex justify-center py-0.5">
                            <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
