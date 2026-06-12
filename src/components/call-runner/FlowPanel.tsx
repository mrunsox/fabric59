import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  enabledSteps,
  computeVisibleStepIds,
  nextStepIdFor,
  validateStep,
  activeActions,
} from "@/lib/call-runner/flow-execution";
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
import type { CallSessionState } from "@/types/call-runner";

interface Props {
  flow: CampaignFlowContent | null;
  isLoading: boolean;
  session: CallSessionState;
  onValueChange: (key: string, value: unknown) => void;
  onCurrentStep: (id: string | null) => void;
  onCompleted: (id: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

/**
 * Phase 6 · Center panel — live flow execution.
 *
 * Mirrors PreviewRunner semantics (hide_step/show_step/jump_to/require_field,
 * AND/OR groups) but drives the *real* session state hook so Submit / autosave
 * / refresh-resume work end to end. No external writeback happens here.
 */
export function FlowPanel({
  flow,
  isLoading,
  session,
  onValueChange,
  onCurrentStep,
  onCompleted,
  onSubmit,
  submitting,
}: Props) {
  const steps = useMemo(() => (flow ? enabledSteps(flow) : []), [flow]);
  const visibleIds = useMemo(() => computeVisibleStepIds(steps, session.values), [steps, session.values]);
  const orderedVisible = useMemo(() => steps.filter((s) => visibleIds.has(s.id)), [steps, visibleIds]);

  // Bootstrap current step once flow loads.
  useEffect(() => {
    if (!session.currentStepId && orderedVisible.length > 0) {
      onCurrentStep(orderedVisible[0].id);
    }
  }, [session.currentStepId, orderedVisible, onCurrentStep]);

  const current = useMemo(
    () => (session.currentStepId ? steps.find((s) => s.id === session.currentStepId) ?? null : null),
    [steps, session.currentStepId],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const actions = useMemo(() => activeActions(steps, session.values), [steps, session.values]);

  const advance = useCallback(
    (branchGoto?: string | null) => {
      if (!current) return;
      const result = validateStep(current, session.values);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      onCompleted(current.id);
      const nextId = nextStepIdFor({
        step: current,
        steps,
        values: session.values,
        visibleIds,
        branchGoto,
      });
      onCurrentStep(nextId);
    },
    [current, session.values, steps, visibleIds, onCompleted, onCurrentStep],
  );

  const goBack = useCallback(() => {
    const last = session.completedStepIds[session.completedStepIds.length - 1];
    if (last) onCurrentStep(last);
  }, [session.completedStepIds, onCurrentStep]);

  // Keyboard-first: Enter advances when current step isn't a free text area.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        advance();
      }
    }
    const el = rootRef.current;
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, [advance]);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="py-8 text-sm text-muted-foreground text-center">Loading flow…</CardContent>
      </Card>
    );
  }

  if (!flow || flow.steps.length === 0) {
    return (
      <Card className="h-full flex flex-col" data-testid="runner-flow-empty">
        <CardContent className="py-10 text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No published flow for this campaign</p>
          <p className="text-xs text-muted-foreground">Ask an admin to publish a campaign flow before taking calls.</p>
        </CardContent>
      </Card>
    );
  }

  const completedAll = current === null && session.completedStepIds.length > 0;
  const progress = orderedVisible.length === 0
    ? 0
    : Math.min(100, Math.round((session.completedStepIds.length / orderedVisible.length) * 100));

  return (
    <Card className="h-full flex flex-col" data-testid="runner-flow-panel" ref={rootRef}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Live flow</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            Step {Math.min(session.completedStepIds.length + (current ? 1 : 0), orderedVisible.length)} / {orderedVisible.length}
          </Badge>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-y-auto">
        {/* Outline / quick nav */}
        <ol className="grid grid-cols-1 gap-1" aria-label="Flow outline">
          {orderedVisible.map((s, i) => {
            const isCurrent = current?.id === s.id;
            const isDone = session.completedStepIds.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`w-full text-left text-[11px] flex items-center gap-2 rounded px-1.5 py-1 hover:bg-accent/10 ${
                    isCurrent ? "bg-accent/10 text-foreground font-medium" : "text-muted-foreground"
                  }`}
                  onClick={() => onCurrentStep(s.id)}
                  data-testid={`runner-step-outline-${s.id}`}
                >
                  <span className="font-mono w-5 text-right">{i + 1}.</span>
                  {isDone && <CheckCircle2 className="h-3 w-3 text-primary" />}
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {completedAll && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-sm font-medium">Flow complete</p>
            <p className="text-xs text-muted-foreground">
              {session.completedStepIds.length} step(s) traversed.
            </p>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting}
              data-testid="runner-submit"
            >
              {submitting ? "Submitting…" : "Submit interaction"}
            </Button>
          </div>
        )}

        {current && (
          <div className="rounded-md border border-border bg-card p-3 space-y-3" data-testid={`runner-current-step-${current.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {current.type.replace(/_/g, " ")}
                </p>
                <h3 className="text-sm font-semibold leading-snug">{current.title}</h3>
                {current.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
                )}
              </div>
              {current.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
            </div>

            <StepBody
              step={current}
              values={session.values}
              errors={errors}
              onValueChange={onValueChange}
              onBranch={(goto) => advance(goto)}
            />

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={session.completedStepIds.length === 0}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              {current.type !== "question_branch" && current.type !== "end_flow" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => advance()}
                  className="gap-1.5"
                  data-testid="runner-next"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSubmit}
                disabled={submitting}
                className="ml-auto"
              >
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        )}

        {(actions.escalations.length > 0 || actions.notifications.length > 0) && (
          <div className="text-[11px] text-muted-foreground border-t border-border pt-2 space-y-0.5">
            {actions.escalations.length > 0 && (
              <p>Active escalations: {actions.escalations.join(", ")}</p>
            )}
            {actions.notifications.length > 0 && (
              <p>Pending notifications: {actions.notifications.join(", ")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepBody({
  step,
  values,
  errors,
  onValueChange,
  onBranch,
}: {
  step: FlowStep;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onValueChange: (key: string, value: unknown) => void;
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
              <Button
                key={o.id}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onValueChange(`branch_${step.id}`, o.label);
                  onBranch(o.goto ?? null);
                }}
                data-testid={`runner-branch-${o.id}`}
              >
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
      const setV = (x: unknown) => onValueChange(cfg.fieldKey, x);
      const err = errors[cfg.fieldKey];
      return (
        <div className="space-y-1">
          <Label className="text-xs">
            {cfg.helper ?? cfg.fieldKey}
            {step.required && <span className="text-destructive"> *</span>}
          </Label>
          {cfg.fieldType === "long_text" || cfg.fieldType === "ai_summary" || cfg.fieldType === "address" ? (
            <Textarea
              rows={3}
              value={String(v ?? "")}
              onChange={(e) => setV(e.target.value)}
              placeholder={cfg.placeholder}
            />
          ) : cfg.fieldType === "checkbox" ? (
            <Checkbox checked={Boolean(v)} onCheckedChange={(c) => setV(Boolean(c))} />
          ) : cfg.fieldType === "single_select" ? (
            <Select value={String(v ?? "")} onValueChange={setV}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(cfg.options ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : cfg.fieldType === "urgency_selector" ? (
            <Select value={String(v ?? "normal")} onValueChange={setV}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="normal">normal</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>
          ) : cfg.fieldType === "hidden" ? (
            <p className="text-xs text-muted-foreground italic">Hidden — not surfaced to caller.</p>
          ) : (
            <Input
              type={
                cfg.fieldType === "numeric"
                  ? "number"
                  : cfg.fieldType === "datetime"
                    ? "datetime-local"
                    : cfg.fieldType === "phone"
                      ? "tel"
                      : cfg.fieldType === "email"
                        ? "email"
                        : "text"
              }
              value={String(v ?? "")}
              onChange={(e) => setV(e.target.value)}
              placeholder={cfg.placeholder}
              data-testid={`runner-field-${cfg.fieldKey}`}
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
          <Select
            value={String(values.__outcome__ ?? "")}
            onValueChange={(v) => onValueChange("__outcome__", v)}
          >
            <SelectTrigger data-testid="runner-outcome">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {(cfg.allowedOutcomes ?? []).map((o) => (
                <SelectItem key={o.code} value={o.code}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    case "escalation_trigger": {
      const cfg = step.config as EscalationTriggerConfig;
      return (
        <p className="text-sm">
          Escalate to <strong>{cfg.targetRole}</strong>
          {cfg.reason ? ` — ${cfg.reason}` : ""}.
        </p>
      );
    }
    case "notification_trigger": {
      const cfg = step.config as NotificationTriggerConfig;
      return (
        <p className="text-sm">
          Queue <strong>{cfg.channel}</strong> notification to <strong>{cfg.target}</strong>.
        </p>
      );
    }
    case "end_flow": {
      const cfg = step.config as EndFlowConfig;
      return (
        <div className="space-y-2">
          <p className="text-sm">{cfg.label}</p>
          {cfg.nextStateSummary && (
            <p className="text-xs text-muted-foreground">{cfg.nextStateSummary}</p>
          )}
          <Button size="sm" onClick={() => onBranch(null)}>
            Complete
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}
