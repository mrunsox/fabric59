/**
 * ASC Slice 3 — Interviewer response contract.
 *
 * Single source of truth for the Interviewer-role schema. Shared by:
 *   - the `asc-orchestrate` edge function (response validation),
 *   - the `useAscInterviewer` hook (client re-validation),
 *   - the reducer/actions (typed targetField enum),
 *   - the AscAssistantPanel UI.
 *
 * Slice 3 is scoped to Steps 1 and 2 only. Adding new target fields must
 * land in lockstep across the edge function prompt, this schema, and any
 * UI that renders proposals.
 */

export const ASC_INTERVIEWER_TARGET_FIELDS = [
  "business.description",
  "business.industryPresetId",
  "business.hours",
  "business.callerPersonas",
  "business.promisesToAvoid",
  "purpose.primaryOutcome",
  "purpose.secondaryOutcome",
  "purpose.blockingOutcomes",
  "purpose.sharedAcrossClients",
] as const;

export type AscInterviewerTargetField =
  (typeof ASC_INTERVIEWER_TARGET_FIELDS)[number];

export type AscInterviewerInputKind = "text" | "select" | "chips" | "boolean";

export type AscInterviewerProposalValue = string | string[] | boolean;

export interface AscInterviewerNextQuestion {
  id: string;
  prompt: string;
  targetField: AscInterviewerTargetField;
  inputKind: AscInterviewerInputKind;
  options?: string[];
}

export interface AscInterviewerProposalPayload {
  targetField: AscInterviewerTargetField;
  value: AscInterviewerProposalValue;
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface AscInterviewerResponse {
  step: 1 | 2;
  nextQuestion: AscInterviewerNextQuestion | null;
  proposedFields: AscInterviewerProposalPayload[];
  confirmedFieldsAcknowledged: AscInterviewerTargetField[];
}

const TARGET_SET: ReadonlySet<string> = new Set(ASC_INTERVIEWER_TARGET_FIELDS);
const CONFIDENCE_SET = new Set(["high", "medium", "low"]);
const INPUT_KIND_SET = new Set(["text", "select", "chips", "boolean"]);

function isTargetField(v: unknown): v is AscInterviewerTargetField {
  return typeof v === "string" && TARGET_SET.has(v);
}

function isValidValue(v: unknown): v is AscInterviewerProposalValue {
  if (typeof v === "string" || typeof v === "boolean") return true;
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Pure validator. Returns the typed response or null if anything is off.
 * Intentionally strict — any deviation must fail safely upstream.
 */
export function parseInterviewerResponse(
  raw: unknown,
): AscInterviewerResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (r.step !== 1 && r.step !== 2) return null;

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
    nextQuestion = {
      id: q.id,
      prompt: q.prompt,
      targetField: q.targetField,
      inputKind: q.inputKind as AscInterviewerInputKind,
      options,
    };
  }

  if (!Array.isArray(r.proposedFields)) return null;
  const proposedFields: AscInterviewerProposalPayload[] = [];
  for (const p of r.proposedFields) {
    if (!p || typeof p !== "object") return null;
    const pp = p as Record<string, unknown>;
    if (!isTargetField(pp.targetField)) return null;
    if (!isValidValue(pp.value)) return null;
    if (typeof pp.confidence !== "string" || !CONFIDENCE_SET.has(pp.confidence))
      return null;
    if (typeof pp.rationale !== "string") return null;
    proposedFields.push({
      targetField: pp.targetField,
      value: pp.value,
      confidence: pp.confidence as "high" | "medium" | "low",
      rationale: pp.rationale,
    });
  }

  if (!Array.isArray(r.confirmedFieldsAcknowledged)) return null;
  const confirmedFieldsAcknowledged: AscInterviewerTargetField[] = [];
  for (const f of r.confirmedFieldsAcknowledged) {
    if (!isTargetField(f)) continue; // tolerate unknown strings here
    confirmedFieldsAcknowledged.push(f);
  }

  return {
    step: r.step,
    nextQuestion,
    proposedFields,
    confirmedFieldsAcknowledged,
  };
}

/**
 * Read the current value of a target field out of an AscDraft input shape.
 * Centralized so the reducer's "manual wins over stale proposal" check and
 * the hook's snapshot logic agree on the same comparison.
 */
export function readTargetFieldValue(
  input: {
    business: {
      description: string;
      industryPresetId: string;
      hours: { coverage?: string; notes?: string };
      callerPersonas: string[];
      promisesToAvoid?: string[];
    };
    purpose: {
      primaryOutcome: string;
      secondaryOutcome?: string;
      blockingOutcomes: string[];
      sharedAcrossClients: boolean;
    };
  },
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

/** Stable serialization for snapshot comparison across primitives + arrays. */
export function serializeFieldValue(
  v: AscInterviewerProposalValue | null | undefined,
): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return JSON.stringify([...v].sort());
  return JSON.stringify(v);
}

/**
 * Which slot in AscWizardInput a target field belongs to. Used by reducer
 * to clear pending proposals when the user manually edits the same slot.
 */
export function targetFieldSlot(
  field: AscInterviewerTargetField,
): "business" | "purpose" {
  return field.startsWith("business.") ? "business" : "purpose";
}

export function targetFieldKey(field: AscInterviewerTargetField): string {
  return field.split(".")[1];
}
