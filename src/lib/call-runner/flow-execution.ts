/**
 * Phase 6 · pure flow execution helpers.
 *
 * Mirrors the semantics used by Phase 5's PreviewRunner so live and preview
 * behavior stay deterministic and identical: enabled steps in `order`,
 * hide_step / show_step / require_field / jump_to via FlowRule evaluation
 * (AND/OR groups, full operator set from `evaluate.ts`).
 */
import { ruleFires } from "@/lib/campaign-flow/evaluate";
import type {
  CampaignFlowContent,
  FieldCaptureConfig,
  FlowStep,
} from "@/types/campaign-flow";

export function enabledSteps(content: CampaignFlowContent): FlowStep[] {
  return content.steps.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
}

export function computeVisibleStepIds(
  steps: FlowStep[],
  values: Record<string, unknown>,
): Set<string> {
  const hidden = new Set<string>();
  const forcedVisible = new Set<string>();
  for (const s of steps) {
    for (const r of s.rules) {
      if (r.action.type === "hide_step" && ruleFires(r, values)) hidden.add(r.action.stepId);
      if (r.action.type === "show_step" && ruleFires(r, values)) forcedVisible.add(r.action.stepId);
    }
  }
  return new Set(steps.filter((s) => forcedVisible.has(s.id) || !hidden.has(s.id)).map((s) => s.id));
}

export function nextStepIdFor(params: {
  step: FlowStep;
  steps: FlowStep[];
  values: Record<string, unknown>;
  visibleIds: Set<string>;
  branchGoto?: string | null;
}): string | null {
  const { step, steps, values, visibleIds, branchGoto } = params;
  // 1) Rule-level jump_to wins.
  for (const r of step.rules) {
    if (r.action.type === "jump_to" && ruleFires(r, values)) return r.action.stepId;
  }
  // 2) Per-branch goto wins next.
  if (branchGoto) return branchGoto;
  // 3) Explicit nextStepId on the step.
  if (step.nextStepId) return step.nextStepId;
  // 4) Sequential — next visible step after this one.
  const idx = steps.findIndex((s) => s.id === step.id);
  for (let i = idx + 1; i < steps.length; i++) {
    if (visibleIds.has(steps[i].id)) return steps[i].id;
  }
  return null;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

export function validateStep(
  step: FlowStep,
  values: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {};
  if (step.type === "field_capture") {
    const cfg = step.config as FieldCaptureConfig;
    if (step.required) {
      const v = values[cfg.fieldKey];
      if (v === undefined || v === null || v === "") errors[cfg.fieldKey] = "Required";
    }
    if (cfg.validation) {
      const raw = values[cfg.fieldKey];
      const str = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
      if (cfg.validation.minLength && str.length < cfg.validation.minLength) {
        errors[cfg.fieldKey] = `Must be at least ${cfg.validation.minLength} characters`;
      }
      if (cfg.validation.maxLength && str.length > cfg.validation.maxLength) {
        errors[cfg.fieldKey] = `Must be at most ${cfg.validation.maxLength} characters`;
      }
      if (cfg.validation.pattern && str && !new RegExp(cfg.validation.pattern).test(str)) {
        errors[cfg.fieldKey] = "Invalid format";
      }
    }
  }
  // require_field rules at step scope.
  for (const r of step.rules) {
    if (r.action.type === "require_field" && ruleFires(r, values)) {
      const v = values[r.action.fieldKey];
      if (v === undefined || v === null || v === "") {
        errors[r.action.fieldKey] = "Required by rule";
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export interface EnabledActions {
  escalations: string[];
  notifications: string[];
}

/** Resolve enable_escalation / enable_notification rule actions for the current values. */
export function activeActions(steps: FlowStep[], values: Record<string, unknown>): EnabledActions {
  const escalations = new Set<string>();
  const notifications = new Set<string>();
  for (const s of steps) {
    for (const r of s.rules) {
      if (!ruleFires(r, values)) continue;
      if (r.action.type === "enable_escalation") escalations.add(r.action.targetId);
      if (r.action.type === "enable_notification") notifications.add(r.action.targetId);
    }
  }
  return { escalations: [...escalations], notifications: [...notifications] };
}
