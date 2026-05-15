/**
 * Pure evaluator for FormSchemaV1 logic rules.
 *
 * Given the full schema and the current values map, returns a snapshot of
 * what should be visible, what's required, where to jump, whether to end
 * with an outcome, and which notification keys to fire. The runner calls
 * this on every change.
 *
 * Semantics:
 *   - A field/section is hidden if any matching `hide_field` rule fires.
 *   - `show_field` overrides hide (explicit show wins).
 *   - `require_field` augments the field's static `required` flag.
 *   - `prefill` writes a value if the target key is currently empty/null.
 *   - The first matching `jump_to_section` action wins.
 *   - The first matching `end_with_outcome` action wins.
 *   - All matching `trigger_notification` keys are accumulated.
 *   - Disabled rules (`enabled === false`) are skipped.
 *
 * Conditions: AND within a group, OR across groups. A rule fires if ANY
 * group matches (or if it has no conditions at all — treated as always on).
 */
import type {
  FormField,
  FormSchemaV1,
  LogicAction,
  LogicCondition,
  LogicRule,
} from "@/types/form-schema";

export interface EvaluatedSchema {
  /** Field keys explicitly hidden by logic. */
  hiddenFieldKeys: Set<string>;
  /** Field keys explicitly required by logic (additive on top of `field.required`). */
  requiredFieldKeys: Set<string>;
  /** First jump target found, or null. */
  jumpToSectionId: string | null;
  /** First outcome key found, or null. */
  endedOutcomeKey: string | null;
  /** Notification keys to fire (deduped). */
  notificationsToFire: string[];
  /** Prefill writes to apply: key → value (only when target currently empty). */
  prefill: Record<string, string | number | boolean>;
}

const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0);

function compare(a: unknown, b: unknown, op: LogicCondition["op"]): boolean {
  switch (op) {
    case "equals":
      return String(a ?? "") === String(b ?? "");
    case "not_equals":
      return String(a ?? "") !== String(b ?? "");
    case "contains":
      if (Array.isArray(a)) return a.map(String).includes(String(b));
      return String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
    case "not_contains":
      if (Array.isArray(a)) return !a.map(String).includes(String(b));
      return !String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
    case "is_empty":
      return isEmpty(a);
    case "is_not_empty":
      return !isEmpty(a);
    case "gt":
      return Number(a) > Number(b);
    case "lt":
      return Number(a) < Number(b);
  }
}

function ruleMatches(rule: LogicRule, values: Record<string, unknown>): boolean {
  if (rule.enabled === false) return false;
  if (rule.groups.length === 0) return true;
  return rule.groups.some((g) => {
    if (g.all.length === 0) return true;
    return g.all.every((c) => compare(values[c.fieldKey], c.value, c.op));
  });
}

export function evaluateSchema(
  schema: FormSchemaV1,
  values: Record<string, unknown>,
): EvaluatedSchema {
  const hidden = new Set<string>();
  const shown = new Set<string>();
  const required = new Set<string>();
  const notifications = new Set<string>();
  const prefill: Record<string, string | number | boolean> = {};
  let jumpToSectionId: string | null = null;
  let endedOutcomeKey: string | null = null;

  for (const rule of schema.logic) {
    if (!ruleMatches(rule, values)) continue;
    for (const action of rule.actions) {
      applyAction(action, {
        hidden,
        shown,
        required,
        notifications,
        prefill,
        values,
        setJump: (id) => { if (jumpToSectionId === null) jumpToSectionId = id; },
        setEnd: (k) => { if (endedOutcomeKey === null) endedOutcomeKey = k; },
      });
    }
  }

  // Explicit show overrides hide.
  for (const k of shown) hidden.delete(k);

  return {
    hiddenFieldKeys: hidden,
    requiredFieldKeys: required,
    jumpToSectionId,
    endedOutcomeKey,
    notificationsToFire: Array.from(notifications),
    prefill,
  };
}

interface ApplyCtx {
  hidden: Set<string>;
  shown: Set<string>;
  required: Set<string>;
  notifications: Set<string>;
  prefill: Record<string, string | number | boolean>;
  values: Record<string, unknown>;
  setJump: (id: string) => void;
  setEnd: (k: string) => void;
}

function applyAction(action: LogicAction, ctx: ApplyCtx) {
  switch (action.type) {
    case "hide_field":
      ctx.hidden.add(action.fieldKey);
      return;
    case "show_field":
      ctx.shown.add(action.fieldKey);
      return;
    case "require_field":
      ctx.required.add(action.fieldKey);
      return;
    case "jump_to_section":
      ctx.setJump(action.sectionId);
      return;
    case "end_with_outcome":
      ctx.setEnd(action.outcomeKey);
      return;
    case "trigger_notification":
      ctx.notifications.add(action.notificationKey);
      return;
    case "prefill":
      if (isEmpty(ctx.values[action.fieldKey])) {
        ctx.prefill[action.fieldKey] = action.value;
      }
      return;
  }
}

/** True if a field has any meaningful value the runner should consider. */
export function hasValue(v: unknown): boolean {
  return !isEmpty(v);
}

/** Per-field validation. Returns null if valid, else a short error message. */
export function validateField(
  field: FormField,
  value: unknown,
  required: boolean,
): string | null {
  if (required && isEmpty(value)) return `${field.label || field.key} is required`;
  if (isEmpty(value)) return null;

  const v = field.validation ?? {};
  const s = typeof value === "string" ? value : "";

  if (field.type === "email" && s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return "Enter a valid email";
  }
  if (field.type === "url" && s) {
    try {
      // eslint-disable-next-line no-new
      new URL(s);
    } catch {
      return "Enter a valid URL";
    }
  }
  if (v.minLength !== undefined && s.length < v.minLength) {
    return `Minimum ${v.minLength} characters`;
  }
  if (v.maxLength !== undefined && s.length > v.maxLength) {
    return `Maximum ${v.maxLength} characters`;
  }
  if (v.pattern && s && !new RegExp(v.pattern).test(s)) {
    return "Format is invalid";
  }
  if ((field.type === "number" || field.type === "currency") && value !== "") {
    const n = Number(value);
    if (Number.isNaN(n)) return "Enter a number";
    if (v.min !== undefined && n < v.min) return `Must be ≥ ${v.min}`;
    if (v.max !== undefined && n > v.max) return `Must be ≤ ${v.max}`;
  }
  return null;
}
