import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Send,
  Loader2,
  Sparkle,
  Info,
  Phone,
  Mail,
  Megaphone,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill, RunnerSurface } from "./primitives";
import { cn } from "@/lib/utils";
import {
  matchBranchHotkey,
  matchHotkey,
  shouldIgnoreEvent,
  HOTKEYS,
} from "@/lib/call-runner/hotkeys";
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
  /** Phase 7 — surfaces a deferred submission state inline. */
  submissionState?: "idle" | "submitting" | "accepted" | "deferred" | "error";
}

const STEP_TYPE_LABEL: Record<string, string> = {
  information_display: "Display",
  question_branch: "Question",
  field_capture: "Capture",
  outcome_disposition: "Disposition",
  escalation_trigger: "Escalation",
  notification_trigger: "Notification",
  end_flow: "End",
};

const STEP_TYPE_ICON: Record<string, typeof Info> = {
  information_display: Info,
  question_branch: ListChecks,
  field_capture: Sparkle,
  outcome_disposition: CheckCircle2,
  escalation_trigger: Megaphone,
  notification_trigger: Mail,
  end_flow: CheckCircle2,
};

/**
 * Center panel — live flow execution. Dominant focus area.
 *
 * Visual model:
 *   - A compact progress rail at the top (completed / active / upcoming).
 *   - A single dominant active step card with the script line, step body,
 *     inline validation, and a sticky action row.
 *   - Compressed past + upcoming steps for quick navigation.
 *   - Inline submission state (submitting / accepted / deferred / error)
 *     so the agent always sees what happened after they press Submit.
 *
 * Behavior unchanged: same execution semantics, same validate / advance /
 * back / submit contracts, same hotkeys, same testids consumed elsewhere.
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
  submissionState = "idle",
}: Props) {
  const steps = useMemo(() => (flow ? enabledSteps(flow) : []), [flow]);
  const visibleIds = useMemo(
    () => computeVisibleStepIds(steps, session.values),
    [steps, session.values],
  );
  const orderedVisible = useMemo(
    () => steps.filter((s) => visibleIds.has(s.id)),
    [steps, visibleIds],
  );

  // Bootstrap current step once flow loads.
  useEffect(() => {
    if (!session.currentStepId && orderedVisible.length > 0) {
      onCurrentStep(orderedVisible[0].id);
    }
  }, [session.currentStepId, orderedVisible, onCurrentStep]);

  const current = useMemo(
    () =>
      session.currentStepId ? steps.find((s) => s.id === session.currentStepId) ?? null : null,
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

  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const advanceDef = HOTKEYS.find((h) => h.id === "advance")!;
    const backDef = HOTKEYS.find((h) => h.id === "back")!;
    const submitDef = HOTKEYS.find((h) => h.id === "submit")!;
    function onKey(e: KeyboardEvent) {
      if (matchHotkey(e, advanceDef)) {
        e.preventDefault();
        advance();
        return;
      }
      if (matchHotkey(e, backDef)) {
        e.preventDefault();
        goBack();
        return;
      }
      if (matchHotkey(e, submitDef)) {
        e.preventDefault();
        onSubmit();
        return;
      }
      if (shouldIgnoreEvent(e)) return;
      if (current?.type !== "question_branch") return;
      const idx = matchBranchHotkey(e);
      if (idx == null) return;
      const cfg = current.config as QuestionBranchConfig;
      const opt = (cfg.options ?? [])[idx - 1];
      if (!opt) return;
      e.preventDefault();
      onValueChange(`branch_${current.id}`, opt.label);
      onValueChange("__branch_label__", opt.label);
      advance(opt.goto ?? null);
    }
    const el = rootRef.current;
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, [advance, goBack, onSubmit, current, onValueChange]);

  const requiredRemaining = useMemo(
    () =>
      orderedVisible.filter(
        (s) => s.required && !session.completedStepIds.includes(s.id) && s.id !== current?.id,
      ),
    [orderedVisible, session.completedStepIds, current],
  );

  if (isLoading) {
    return (
      <RunnerSurface>
        <div className="flex-1 flex items-center justify-center p-6" data-testid="runner-flow-loading">
          <div className="text-center space-y-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" aria-hidden />
            <p className="text-sm">Loading flow…</p>
          </div>
        </div>
      </RunnerSurface>
    );
  }

  if (!flow || flow.steps.length === 0) {
    return (
      <RunnerSurface>
        <div
          className="flex-1 flex items-center justify-center p-6"
          data-testid="runner-flow-empty"
        >
          <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center space-y-2 max-w-sm">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold">No published flow for this campaign</p>
            <p className="text-xs text-muted-foreground">
              Ask an admin to publish a campaign flow before taking calls. The runner stays
              non-blocking so you can still capture notes.
            </p>
          </div>
        </div>
      </RunnerSurface>
    );
  }

  const completedAll = current === null && session.completedStepIds.length > 0;
  const progress =
    orderedVisible.length === 0
      ? 0
      : Math.min(100, Math.round((session.completedStepIds.length / orderedVisible.length) * 100));

  const currentIndex = current ? orderedVisible.findIndex((s) => s.id === current.id) : -1;
  const nextStep = currentIndex >= 0 ? orderedVisible[currentIndex + 1] : null;

  // Step blocking reason — surfaced as a chip on the action row.
  const blockingReason = (() => {
    if (!current) return null;
    if (current.required && Object.keys(errors).length > 0) {
      return `${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? "" : "s"} need attention`;
    }
    if (requiredRemaining.length > 0) {
      return `${requiredRemaining.length} required step${requiredRemaining.length === 1 ? "" : "s"} remaining`;
    }
    return null;
  })();

  return (
    <RunnerSurface data-testid="runner-flow-panel" className="overflow-hidden">
      {/* Header: title + progress rail */}
      <div className="px-4 pt-3 pb-2.5 border-b shrink-0 space-y-2.5" ref={rootRef as never}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-primary" /> Live flow
          </h2>
          <div className="flex items-center gap-1.5">
            {requiredRemaining.length > 0 && (
              <StatusPill
                tone="warn"
                icon={AlertTriangle}
                dense
                data-testid="runner-required-remaining"
              >
                <span data-testid="runner-required-remaining">
                  {requiredRemaining.length} required
                </span>
              </StatusPill>
            )}
            <StatusPill dense tone="neutral">
              Step{" "}
              {Math.min(session.completedStepIds.length + (current ? 1 : 0), orderedVisible.length)}{" "}
              / {orderedVisible.length}
            </StatusPill>
          </div>
        </div>

        <ProgressRail
          steps={orderedVisible}
          currentId={current?.id ?? null}
          completedIds={session.completedStepIds}
        />

        {nextStep && (
          <p
            className="text-[10px] uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1"
            data-testid="runner-next-preview"
          >
            <span className="opacity-70">Up next →</span>
            <span className="normal-case tracking-normal text-[11px] text-foreground/80 truncate">
              {nextStep.title}
            </span>
          </p>
        )}
      </div>


      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {completedAll && (
          <SubmissionPanel
            state={submissionState}
            stepsCount={session.completedStepIds.length}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        )}

        {/* Active step — the dominant focus card. */}
        {current && (
          <ActiveStepCard
            step={current}
            index={currentIndex}
            errors={errors}
            steps={steps}
            values={session.values}
            onValueChange={onValueChange}
            onBranch={(goto) => advance(goto)}
          />
        )}

        {/* Past steps (collapsed) */}
        {orderedVisible.length > 0 && (
          <CompactStepList
            steps={orderedVisible}
            current={current}
            completedIds={session.completedStepIds}
            values={session.values}
            onSelect={(id) => onCurrentStep(id)}
          />
        )}

        {(actions.escalations.length > 0 || actions.notifications.length > 0) && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] space-y-0.5">
            {actions.escalations.length > 0 && (
              <p className="text-amber-700 dark:text-amber-300">
                Active escalations: {actions.escalations.join(", ")}
              </p>
            )}
            {actions.notifications.length > 0 && (
              <p className="text-amber-700 dark:text-amber-300">
                Pending notifications: {actions.notifications.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </RunnerSurface>
  );
}

function ProgressRail({
  steps,
  currentId,
  completedIds,
}: {
  steps: FlowStep[];
  currentId: string | null;
  completedIds: string[];
}) {
  if (steps.length === 0) return null;
  return (
    <ol
      className="flex items-center gap-1"
      aria-label="Flow progress"
      data-testid="runner-progress-rail"
    >
      {steps.map((s) => {
        const isCurrent = s.id === currentId;
        const isDone = completedIds.includes(s.id);
        return (
          <li
            key={s.id}
            title={s.title}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              isCurrent
                ? "bg-primary"
                : isDone
                  ? "bg-primary/50"
                  : "bg-muted",
            )}
          />
        );
      })}
    </ol>
  );
}

function SubmissionPanel({
  state,
  stepsCount,
  onSubmit,
  submitting,
}: {
  state: NonNullable<Props["submissionState"]>;
  stepsCount: number;
  onSubmit: () => void;
  submitting?: boolean;
}) {
  if (state === "accepted") {
    return (
      <div
        className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5"
        data-testid="runner-submission-accepted"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-medium">Interaction submitted</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Pipeline accepted the record. You can close this session.
        </p>
      </div>
    );
  }
  if (state === "deferred") {
    return (
      <div
        className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5"
        data-testid="runner-submission-deferred"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-medium">Submission queued</p>
        </div>
        <p className="text-xs text-muted-foreground">
          The pipeline did not acknowledge yet. Your work is safely queued in the local outbox and
          will be replayed automatically.
        </p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div
        className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5"
        data-testid="runner-submission-error"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium">Could not submit</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Retry below — your captured values remain in the session.
        </p>
        <Button size="sm" onClick={onSubmit} disabled={submitting} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Retry submission
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-sm font-medium">Flow complete</p>
      <p className="text-xs text-muted-foreground">
        {stepsCount} step{stepsCount === 1 ? "" : "s"} traversed. Submit to hand off to the
        pipeline.
      </p>
      <Button size="sm" onClick={onSubmit} disabled={submitting} className="gap-1.5">
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" /> Submit interaction
          </>
        )}
      </Button>
    </div>
  );
}

function ActiveStepCard({
  step,
  index,
  errors,
  steps,
  values,
  onValueChange,
  onBranch,
}: {
  step: FlowStep;
  index: number;
  errors: Record<string, string>;
  steps: FlowStep[];
  values: Record<string, unknown>;
  onValueChange: (key: string, value: unknown) => void;
  onBranch: (goto?: string | null) => void;
}) {
  const Icon = STEP_TYPE_ICON[step.type] ?? Info;
  const scriptLine = getScriptLine(step);
  return (
    <article
      data-testid={`runner-current-step-${step.id}`}
      data-active="true"
      aria-label={`Active step: ${step.title}`}
      className="rounded-lg border-2 border-primary/40 bg-card p-4 space-y-3 shadow-md ring-1 ring-primary/10"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="font-mono tabular-nums">{index + 1}.</span>
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5">
            <Icon className="h-3 w-3" aria-hidden />
            {STEP_TYPE_LABEL[step.type] ?? step.type.replace(/_/g, " ")}
          </span>
        </div>
        {step.required && (
          <StatusPill tone="warn" dense>
            Required
          </StatusPill>
        )}
      </header>
      {scriptLine && (
        <p className="text-[20px] leading-snug font-semibold tracking-tight text-foreground">
          {scriptLine}
        </p>
      )}
      <StepBody
        step={step}
        steps={steps}
        values={values}
        errors={errors}
        onValueChange={onValueChange}
        onBranch={onBranch}
      />
    </article>
  );
}

function CompactStepList({
  steps,
  current,
  completedIds,
  values,
  onSelect,
}: {
  steps: FlowStep[];
  current: FlowStep | null;
  completedIds: string[];
  values: Record<string, unknown>;
  onSelect: (id: string) => void;
}) {
  const others = steps.filter((s) => s.id !== current?.id);
  if (others.length === 0) return null;
  return (
    <details className="group rounded-md border bg-muted/10" open>
      <summary className="cursor-pointer list-none px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md">
        <span>All steps</span>
        <span className="tabular-nums">{steps.length}</span>
      </summary>
      <ol className="px-2 pb-2 space-y-1" aria-label="All flow steps">
        {steps.map((s, i) => {
          const isCurrent = current?.id === s.id;
          const isDone = completedIds.includes(s.id);
          const capturedPreview = getCapturedPreview(s, values);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  isCurrent
                    ? "bg-primary/10 text-foreground"
                    : isDone
                      ? "hover:bg-muted/60 text-foreground"
                      : "hover:bg-muted/40 text-muted-foreground",
                )}
                data-testid={`runner-step-outline-${s.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono w-5 text-right text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" aria-hidden />
                  ) : isCurrent ? (
                    <span className="h-3 w-3 rounded-full bg-primary shrink-0" aria-hidden />
                  ) : (
                    <Circle
                      className="h-3 w-3 text-muted-foreground/40 shrink-0"
                      aria-hidden
                    />
                  )}
                  <span className="font-medium truncate">{s.title}</span>
                  {s.required && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Req
                    </span>
                  )}
                </div>
                {capturedPreview && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 ml-7 truncate">
                    {capturedPreview}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

/** Extract the line the agent should say aloud for a given step. */
function getScriptLine(step: FlowStep): string {
  switch (step.type) {
    case "information_display":
      return (step.config as InformationDisplayConfig).body ?? step.title;
    case "question_branch":
      return (step.config as QuestionBranchConfig).prompt ?? step.title;
    case "field_capture": {
      const cfg = step.config as FieldCaptureConfig;
      return cfg.helper ?? step.title;
    }
    case "end_flow":
      return (step.config as EndFlowConfig).label ?? step.title;
    default:
      return step.title;
  }
}

/** Short preview of what was captured at this step. */
function getCapturedPreview(step: FlowStep, values: Record<string, unknown>): string | null {
  if (step.type === "field_capture") {
    const cfg = step.config as FieldCaptureConfig;
    const v = values[cfg.fieldKey];
    if (v != null && v !== "") return String(v);
  }
  if (step.type === "question_branch") {
    const v = values[`branch_${step.id}`];
    if (v) return String(v);
  }
  if (step.type === "outcome_disposition") {
    const v = values.__outcome__;
    if (v) return `Disposition: ${String(v)}`;
  }
  return null;
}

function StepBody({
  step,
  steps,
  values,
  errors,
  onValueChange,
  onBranch,
}: {
  step: FlowStep;
  steps: FlowStep[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onValueChange: (key: string, value: unknown) => void;
  onBranch: (goto?: string | null) => void;
}) {
  switch (step.type) {
    case "information_display": {
      const cfg = step.config as InformationDisplayConfig;
      return <p className="text-sm whitespace-pre-wrap text-muted-foreground">{cfg.body}</p>;
    }
    case "question_branch": {
      const cfg = step.config as QuestionBranchConfig;
      const opts = cfg.options ?? [];
      return (
        <div className="space-y-2">
          <div className="grid gap-1.5">
            {opts.map((o, i) => (
              <Button
                key={o.id}
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => {
                  onValueChange(`branch_${step.id}`, o.label);
                  onValueChange("__branch_label__", o.label);
                  onBranch(o.goto ?? null);
                }}
                data-testid={`runner-branch-${o.id}`}
              >
                {i < 9 && (
                  <kbd
                    className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground"
                    aria-hidden
                  >
                    {i + 1}
                  </kbd>
                )}
                <span className="truncate">{o.label}</span>
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Press <kbd className="font-mono">1–{Math.min(opts.length, 9)}</kbd> to pick.
          </p>
        </div>
      );
    }
    case "field_capture": {
      const cfg = step.config as FieldCaptureConfig;
      const v = values[cfg.fieldKey];
      const setV = (x: unknown) => onValueChange(cfg.fieldKey, x);
      const err = errors[cfg.fieldKey];
      const fieldId = `runner-field-${cfg.fieldKey}-input`;
      return (
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1" htmlFor={fieldId}>
            {cfg.helper ?? cfg.fieldKey}
            {step.required && (
              <span className="text-destructive" aria-label="required">
                *
              </span>
            )}
          </Label>
          {cfg.fieldType === "long_text" ||
          cfg.fieldType === "ai_summary" ||
          cfg.fieldType === "address" ? (
            <Textarea
              id={fieldId}
              rows={3}
              value={String(v ?? "")}
              onChange={(e) => setV(e.target.value)}
              placeholder={cfg.placeholder}
              aria-invalid={Boolean(err)}
            />
          ) : cfg.fieldType === "checkbox" ? (
            <Checkbox
              id={fieldId}
              checked={Boolean(v)}
              onCheckedChange={(c) => setV(Boolean(c))}
            />
          ) : cfg.fieldType === "single_select" ? (
            <Select value={String(v ?? "")} onValueChange={setV}>
              <SelectTrigger id={fieldId} aria-invalid={Boolean(err)}>
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
              <SelectTrigger id={fieldId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="normal">normal</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>
          ) : cfg.fieldType === "hidden" ? (
            <p className="text-xs text-muted-foreground italic">
              Hidden — not surfaced to caller.
            </p>
          ) : (
            <Input
              id={fieldId}
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
              aria-invalid={Boolean(err)}
            />
          )}
          {err && (
            <p className="text-[11px] text-destructive flex items-center gap-1" role="alert">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {err}
            </p>
          )}
        </div>
      );
    }
    case "outcome_disposition": {
      const cfg = step.config as OutcomeDispositionConfig;
      const selected = String(values.__outcome__ ?? "");
      return (
        <div className="space-y-2">
          <Label className="text-xs">Disposition</Label>
          <Select value={selected} onValueChange={(v) => onValueChange("__outcome__", v)}>
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
          {selected && <DispositionEmailPreview outcome={selected} steps={steps} values={values} />}
        </div>
      );
    }
    case "escalation_trigger": {
      const cfg = step.config as EscalationTriggerConfig;
      return (
        <p className="text-sm flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5 text-amber-600" aria-hidden />
          Escalate to <strong>{cfg.targetRole}</strong>
          {cfg.reason ? ` — ${cfg.reason}` : ""}.
        </p>
      );
    }
    case "notification_trigger": {
      const cfg = step.config as NotificationTriggerConfig;
      const ChannelIcon = cfg.channel === "sms" ? Phone : Mail;
      return (
        <p className="text-sm flex items-center gap-1.5">
          <ChannelIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
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
          <Button size="sm" onClick={() => onBranch(null)} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}

function DispositionEmailPreview({
  outcome,
  steps,
  values,
}: {
  outcome: string;
  steps: FlowStep[];
  values: Record<string, unknown>;
}) {
  const notif = steps.find((s) => s.type === "notification_trigger");
  if (!notif) return null;
  const cfg = notif.config as NotificationTriggerConfig;
  const summary = cfg.payloadSummary;

  if (summary && typeof summary === "object") {
    if (summary.skipOutcomes?.includes(outcome)) {
      return (
        <div
          className="rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground"
          data-testid="runner-email-preview-skip"
        >
          No email will be sent for this disposition.
        </div>
      );
    }
    const tpl = summary.templates?.[outcome];
    if (!tpl) {
      return (
        <div className="rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
          No email template configured for this disposition.
        </div>
      );
    }
    const render = (s: string) =>
      s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const v = values[k];
        return v == null || v === "" ? `[${k}]` : String(v);
      });
    return (
      <div
        className="rounded-md border border-primary/30 bg-primary/5 p-2 space-y-1"
        data-testid="runner-email-preview"
      >
        <p className="text-[10px] uppercase tracking-wider text-primary">
          Email preview · {cfg.target}
        </p>
        {tpl.subject && <p className="text-xs font-medium">{render(tpl.subject)}</p>}
        <p className="text-xs whitespace-pre-wrap text-muted-foreground">{render(tpl.body)}</p>
      </div>
    );
  }

  if (typeof summary === "string" && summary) {
    return (
      <div className="rounded-md border bg-muted/30 p-2 text-[11px] text-muted-foreground">
        Will queue {cfg.channel} to <span className="font-mono">{cfg.target}</span>: {summary}
      </div>
    );
  }
  return null;
}
