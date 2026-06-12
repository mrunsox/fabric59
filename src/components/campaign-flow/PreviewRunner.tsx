import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ruleFires } from "@/lib/campaign-flow/evaluate";
import type {
  CampaignFlowContent,
  FlowStep,
  QuestionBranchConfig,
  InformationDisplayConfig,
  FieldCaptureConfig,
  OutcomeDispositionConfig,
  EscalationTriggerConfig,
  NotificationTriggerConfig,
  EndFlowConfig,
} from "@/types/campaign-flow";

/**
 * Agent-style preview. Walks the flow as an agent would experience it,
 * honoring branching, jump-to, hide rules, and required fields.
 * NO real submissions or notifications fire — this is author QA only.
 */
export function PreviewRunner({ content }: { content: CampaignFlowContent }) {
  const enabled = useMemo(
    () => content.steps.filter((s) => s.enabled).sort((a, b) => a.order - b.order),
    [content.steps],
  );
  const firstId = enabled[0]?.id ?? null;
  const [currentId, setCurrentId] = useState<string | null>(firstId);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);

  const current = enabled.find((s) => s.id === currentId) ?? null;

  // Apply hide_step rules to compute visible set.
  const visibleIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const s of enabled) {
      for (const r of s.rules) {
        if (r.action.type === "hide_step" && ruleFires(r, values)) hidden.add(r.action.stepId);
      }
    }
    return new Set(enabled.filter((s) => !hidden.has(s.id)).map((s) => s.id));
  }, [enabled, values]);

  function nextStepIdFor(step: FlowStep, branchGoto?: string | null): string | null {
    // 1) Rule-level jump_to wins.
    for (const r of step.rules) {
      if (r.action.type === "jump_to" && ruleFires(r, values)) return r.action.stepId;
    }
    // 2) Per-branch goto (question_branch options).
    if (branchGoto) return branchGoto;
    // 3) Explicit nextStepId.
    if (step.nextStepId) return step.nextStepId;
    // 4) Sequential — find next visible step after current.
    const idx = enabled.findIndex((s) => s.id === step.id);
    for (let i = idx + 1; i < enabled.length; i++) {
      if (visibleIds.has(enabled[i].id)) return enabled[i].id;
    }
    return null;
  }

  function reset() {
    setValues({});
    setErrors({});
    setHistory([]);
    setCurrentId(firstId);
  }

  function validateAndAdvance(branchGoto?: string | null) {
    if (!current) return;
    const newErrors: Record<string, string> = {};
    if (current.type === "field_capture") {
      const cfg = current.config as FieldCaptureConfig;
      if (current.required && !values[cfg.fieldKey]) newErrors[cfg.fieldKey] = "Required";
    }
    // require_field rules
    for (const r of current.rules) {
      if (r.action.type === "require_field" && ruleFires(r, values) && !values[r.action.fieldKey]) {
        newErrors[r.action.fieldKey] = "Required by rule";
      }
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setHistory((h) => [...h, current.id]);
    setCurrentId(nextStepIdFor(current, branchGoto));
  }

  if (!current) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Flow complete. {history.length} step(s) traversed.</p>
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
            <p className="font-medium mb-1">Captured values</p>
            <pre className="overflow-auto text-[11px]">{JSON.stringify(values, null, 2)}</pre>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Restart preview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="preview-runner">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Step {history.length + 1}</p>
          <CardTitle className="text-sm">{current.title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{current.type}</Badge>
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" /> Restart
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {current.description && <p className="text-xs text-muted-foreground">{current.description}</p>}
        <StepBody step={current} values={values} setValues={setValues} errors={errors}
          onBranch={(goto) => validateAndAdvance(goto)} />
        {current.type !== "question_branch" && current.type !== "end_flow" && (
          <Button size="sm" className="gap-1.5" onClick={() => validateAndAdvance()}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StepBody({
  step, values, setValues, errors, onBranch,
}: {
  step: FlowStep;
  values: Record<string, unknown>;
  setValues: (v: Record<string, unknown>) => void;
  errors: Record<string, string>;
  onBranch: (goto?: string | null) => void;
}) {
  switch (step.type) {
    case "information_display": {
      const cfg = step.config as InformationDisplayConfig;
      return <p className="text-sm whitespace-pre-wrap">{cfg.body}</p>;
    }
    case "question_branch": {
      const cfg = step.config as QuestionBranchConfig;
      return (
        <div className="space-y-2">
          <p className="text-sm">{cfg.prompt}</p>
          <div className="grid gap-1.5">
            {(cfg.options ?? []).map((o) => (
              <Button key={o.id} variant="outline" size="sm" className="justify-start"
                onClick={() => {
                  setValues({ ...values, [`branch_${step.id}`]: o.label });
                  onBranch(o.goto ?? null);
                }}>
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    case "field_capture": {
      const cfg = step.config as FieldCaptureConfig;
      const v = values[cfg.fieldKey];
      const setV = (x: unknown) => setValues({ ...values, [cfg.fieldKey]: x });
      const err = errors[cfg.fieldKey];
      const common = { placeholder: cfg.placeholder };
      return (
        <div className="space-y-1">
          <Label className="text-xs">{cfg.helper ?? cfg.fieldKey}{step.required && <span className="text-destructive"> *</span>}</Label>
          {cfg.fieldType === "long_text" || cfg.fieldType === "ai_summary" || cfg.fieldType === "address" ? (
            <Textarea rows={3} value={String(v ?? "")} onChange={(e) => setV(e.target.value)} {...common} />
          ) : cfg.fieldType === "checkbox" ? (
            <Checkbox checked={Boolean(v)} onCheckedChange={(c) => setV(Boolean(c))} />
          ) : cfg.fieldType === "single_select" ? (
            <Select value={String(v ?? "")} onValueChange={setV}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(cfg.options ?? []).map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : cfg.fieldType === "urgency_selector" ? (
            <Select value={String(v ?? "normal")} onValueChange={setV}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="normal">normal</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>
          ) : cfg.fieldType === "hidden" ? (
            <p className="text-xs text-muted-foreground italic">Hidden / system field — not shown to agent.</p>
          ) : (
            <Input
              type={cfg.fieldType === "numeric" ? "number" : cfg.fieldType === "datetime" ? "datetime-local" : "text"}
              value={String(v ?? "")} onChange={(e) => setV(e.target.value)} {...common}
            />
          )}
          {err && <p className="text-[11px] text-destructive">{err}</p>}
        </div>
      );
    }
    case "outcome_disposition": {
      const cfg = step.config as OutcomeDispositionConfig;
      return (
        <div className="space-y-1">
          <Label className="text-xs">Disposition</Label>
          <Select value={String(values["__outcome__"] ?? "")} onValueChange={(v) => setValues({ ...values, __outcome__: v })}>
            <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {(cfg.allowedOutcomes ?? []).map((o) => (
                <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    case "escalation_trigger": {
      const cfg = step.config as EscalationTriggerConfig;
      return <p className="text-sm">Preview: would escalate to <strong>{cfg.targetRole}</strong>{cfg.reason ? ` — ${cfg.reason}` : ""}.</p>;
    }
    case "notification_trigger": {
      const cfg = step.config as NotificationTriggerConfig;
      return <p className="text-sm">Preview: would send <strong>{cfg.channel}</strong> notification to <strong>{cfg.target}</strong>.</p>;
    }
    case "end_flow": {
      const cfg = step.config as EndFlowConfig;
      return (
        <div className="space-y-2">
          <p className="text-sm">{cfg.label}</p>
          {cfg.nextStateSummary && <p className="text-xs text-muted-foreground">{cfg.nextStateSummary}</p>}
          <Button size="sm" onClick={() => onBranch(null)}>Complete</Button>
        </div>
      );
    }
    default:
      return null;
  }
}
