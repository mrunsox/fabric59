/**
 * ASC Slice 3/4 — Interviewer response contract.
 *
 * Slice 3 covered Steps 1–2. Slice 4 widens the enum to cover Steps 3–4:
 *   - `callerReasons.add` proposes a new caller reason (value = label string).
 *   - `callerReason.*` proposes a value scoped to a specific caller reason
 *     (the proposal MUST carry `reasonId`). Per-reason targets cover the
 *     handling fields collected in Step 4.
 *
 * Per-reason proposals are intentionally lightweight in this slice:
 *   - `callerReason.branching.add` carries a simple `{trigger, outcome}`
 *     hint. No nested branches, no graph semantics, no proto-flow IDs.
 */

import type { AscCallerReason, AscWizardInput } from "./types";

export const ASC_INTERVIEWER_TARGET_FIELDS = [
  // ── Step 1 ──
  "business.description",
  "business.industryPresetId",
  "business.hours",
  "business.callerPersonas",
  "business.promisesToAvoid",
  // ── Step 2 ──
  "purpose.primaryOutcome",
  "purpose.secondaryOutcome",
  "purpose.blockingOutcomes",
  "purpose.sharedAcrossClients",
  // ── Step 3 ──
  "callerReasons.add",
  // ── Step 4 (per-reason; proposal MUST carry reasonId) ──
  "callerReason.requiredCapture",
  "callerReason.opener",
  "callerReason.escalation",
  "callerReason.variants.afterHours",
  "callerReason.variants.voicemail",
  "callerReason.branching.add",
] as const;

export type AscInterviewerTargetField =
  (typeof ASC_INTERVIEWER_TARGET_FIELDS)[number];

export type AscInterviewerInputKind = "text" | "select" | "chips" | "boolean";

export type AscEscalationValue = { when: string; toRole: string };
export type AscBranchHintValue = { trigger: string; outcome: string };

export type AscInterviewerProposalValue =
  | string
  | string[]
  | boolean
  | AscEscalationValue
  | AscBranchHintValue;

export interface AscInterviewerNextQuestion {
  id: string;
  prompt: string;
  targetField: AscInterviewerTargetField;
  inputKind: AscInterviewerInputKind;
  options?: string[];
  /** Optional. Required for `callerReason.*` next questions so the UI can
   *  attach the question to the right reason card. */
  reasonId?: string;
}

export interface AscInterviewerProposalPayload {
  targetField: AscInterviewerTargetField;
  value: AscInterviewerProposalValue;
  confidence: "high" | "medium" | "low";
  rationale: string;
  /** Required when `targetField` starts with `callerReason.`. Ignored for
   *  every other target. */
  reasonId?: string;
}

export interface AscInterviewerResponse {
  step: 1 | 2 | 3 | 4;
  nextQuestion: AscInterviewerNextQuestion | null;
  proposedFields: AscInterviewerProposalPayload[];
  confirmedFieldsAcknowledged: AscInterviewerTargetField[];
}

const TARGET_SET: ReadonlySet<string> = new Set(ASC_INTERVIEWER_TARGET_FIELDS);
const CONFIDENCE_SET = new Set(["high", "medium", "low"]);
const INPUT_KIND_SET = new Set(["text", "select", "chips", "boolean"]);
const ALLOWED_STEPS = new Set([1, 2, 3, 4]);

function isTargetField(v: unknown): v is AscInterviewerTargetField {
  return typeof v === "string" && TARGET_SET.has(v);
}

function isPerReasonField(f: AscInterviewerTargetField): boolean {
  return f.startsWith("callerReason.");
}

function isValidValueForField(
  field: AscInterviewerTargetField,
  v: unknown,
): v is AscInterviewerProposalValue {
  if (field === "callerReason.escalation") {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const o = v as Record<string, unknown>;
    return typeof o.when === "string" && typeof o.toRole === "string";
  }
  if (field === "callerReason.branching.add") {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const o = v as Record<string, unknown>;
    return typeof o.trigger === "string" && typeof o.outcome === "string";
  }
  if (field === "callerReason.requiredCapture") {
    return Array.isArray(v) && v.every((x) => typeof x === "string");
  }
  // Primitive families.
  if (typeof v === "string" || typeof v === "boolean") return true;
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Pure validator. Returns the typed response or null if anything is off.
 * Strict — any deviation must fail safely upstream.
 */
export function parseInterviewerResponse(
  raw: unknown,
): AscInterviewerResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.step !== "number" || !ALLOWED_STEPS.has(r.step)) return null;
  const step = r.step as 1 | 2 | 3 | 4;

  let nextQuestion: AscInterviewerNextQuestion | null = null;
  if (r.nextQuestion !== null && r.nextQuestion !== undefined) {
    if (typeof r.nextQuestion !== "object") return null;
    const q = r.nextQuestion as Record<string, unknown>;
    if (typeof q.id !== "string" || q.id.length === 0) return null;
    if (typeof q.prompt !== "string" || q.prompt.length === 0) return null;
    if (q.prompt.length > 480) return null;
    if (!isTargetField(q.targetField)) return null;
    if (typeof q.inputKind !== "string" || !INPUT_KIND_SET.has(q.inputKind))
      return null;
    let options: string[] | undefined;
    if (q.options !== undefined) {
      if (!Array.isArray(q.options)) return null;
      if (!q.options.every((o) => typeof o === "string")) return null;
      options = q.options as string[];
    }
    const reasonId =
      typeof q.reasonId === "string" && q.reasonId.length > 0
        ? q.reasonId
        : undefined;
    nextQuestion = {
      id: q.id,
      prompt: q.prompt,
      targetField: q.targetField,
      inputKind: q.inputKind as AscInterviewerInputKind,
      options,
      reasonId,
    };
  }

  if (!Array.isArray(r.proposedFields)) return null;
  const proposedFields: AscInterviewerProposalPayload[] = [];
  for (const p of r.proposedFields) {
    if (!p || typeof p !== "object") return null;
    const pp = p as Record<string, unknown>;
    if (!isTargetField(pp.targetField)) return null;
    if (!isValidValueForField(pp.targetField, pp.value)) return null;
    if (typeof pp.confidence !== "string" || !CONFIDENCE_SET.has(pp.confidence))
      return null;
    if (typeof pp.rationale !== "string") return null;
    let reasonId: string | undefined;
    if (isPerReasonField(pp.targetField)) {
      if (typeof pp.reasonId !== "string" || pp.reasonId.length === 0)
        return null;
      reasonId = pp.reasonId;
    }
    proposedFields.push({
      targetField: pp.targetField,
      value: pp.value as AscInterviewerProposalValue,
      confidence: pp.confidence as "high" | "medium" | "low",
      rationale: pp.rationale,
      reasonId,
    });
  }

  if (!Array.isArray(r.confirmedFieldsAcknowledged)) return null;
  const confirmedFieldsAcknowledged: AscInterviewerTargetField[] = [];
  for (const f of r.confirmedFieldsAcknowledged) {
    if (!isTargetField(f)) continue;
    confirmedFieldsAcknowledged.push(f);
  }

  return {
    step,
    nextQuestion,
    proposedFields,
    confirmedFieldsAcknowledged,
  };
}

/** Slice 1/2 readers — Steps 1 & 2 input. */
export function readTargetFieldValue(
  input: AscWizardInput,
  field: AscInterviewerTargetField,
): AscInterviewerProposalValue | null {
  switch (field) {
    case "business.description":
      return input.business.description;
    case "business.industryPresetId":
      return input.business.industryPresetId;
    case "business.hours":
      return input.business.hours?.coverage ?? "";
    case "business.callerPersonas":
      return input.business.callerPersonas ?? [];
    case "business.promisesToAvoid":
      return input.business.promisesToAvoid ?? [];
    case "purpose.primaryOutcome":
      return input.purpose.primaryOutcome;
    case "purpose.secondaryOutcome":
      return input.purpose.secondaryOutcome ?? "";
    case "purpose.blockingOutcomes":
      return input.purpose.blockingOutcomes ?? [];
    case "purpose.sharedAcrossClients":
      return input.purpose.sharedAcrossClients;
    default:
      return null;
  }
}

/** Slice 4 reader for per-reason fields. */
export function readPerReasonFieldValue(
  reason: AscCallerReason | undefined,
  field: AscInterviewerTargetField,
): AscInterviewerProposalValue | null {
  if (!reason) return null;
  switch (field) {
    case "callerReason.requiredCapture":
      return reason.requiredCapture ?? [];
    case "callerReason.opener":
      return reason.opener ?? "";
    case "callerReason.escalation":
      return reason.escalation
        ? { when: reason.escalation.when, toRole: reason.escalation.toRole }
        : { when: "", toRole: "" };
    case "callerReason.variants.afterHours":
      return reason.variants?.afterHours ?? "";
    case "callerReason.variants.voicemail":
      return reason.variants?.voicemail ?? "";
    case "callerReason.branching.add":
      // Append-only; no staleness check, snapshot is unused.
      return "";
    default:
      return null;
  }
}

/** Normalize caller-reason labels for duplicate detection. */
export function normalizeReasonLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable serialization for snapshot comparison across primitives + arrays. */
export function serializeFieldValue(
  v: AscInterviewerProposalValue | null | undefined,
): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return JSON.stringify([...v].sort());
  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    const ordered: Record<string, unknown> = {};
    for (const k of keys) ordered[k] = (v as Record<string, unknown>)[k];
    return JSON.stringify(ordered);
  }
  return JSON.stringify(v);
}

/** Snapshot for the special `callerReasons.add` field — the normalized set
 *  of existing labels at proposal-issue time. */
export function snapshotCallerReasonsLabels(input: AscWizardInput): string {
  return serializeFieldValue(
    input.callerReasons.map((r) => normalizeReasonLabel(r.label)),
  );
}

export type AscTargetFieldSlot =
  | "business"
  | "purpose"
  | "callerReasons"
  | "callerReason";

export function targetFieldSlot(
  field: AscInterviewerTargetField,
): AscTargetFieldSlot {
  if (field === "callerReasons.add") return "callerReasons";
  if (field.startsWith("callerReason.")) return "callerReason";
  if (field.startsWith("business.")) return "business";
  return "purpose";
}

export function targetFieldKey(field: AscInterviewerTargetField): string {
  return field.split(".").slice(1).join(".");
}
