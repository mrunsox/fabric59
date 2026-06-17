/**
 * ASC Slice 5 — Logic Architect response contract.
 *
 * Proposal-only. Reducer/UI own all writes. Strict validator returns null on
 * any deviation so malformed responses fail closed.
 *
 * Per scope guards:
 *   - Step 5 `kind` is a proposal-local hint, not a canonical taxonomy. The
 *     stable identifier is the label.
 *   - Step 6 proposals must reference a real channel/audience from the
 *     supplied grounding; the hook filters non-grounded ones into advisories
 *     so they never become confirmable.
 *   - Step 7 emits `launch.slugCandidates` (string[]); the user picks one and
 *     only the chosen candidate is dispatched as a confirmable write.
 */
import type { AscWizardInput } from "./types";

// ── Outcome kind (PROPOSAL-LOCAL ONLY — do not consume from canonical) ───
export const ASC_LA_OUTCOME_KINDS = [
  "success",
  "qualified",
  "unqualified",
  "callback",
  "voicemail",
  "escalated",
  "blocked",
  "other",
] as const;
export type AscLaOutcomeKind = (typeof ASC_LA_OUTCOME_KINDS)[number];

export const ASC_LA_URGENCIES = ["low", "normal", "high"] as const;
export type AscLaUrgency = (typeof ASC_LA_URGENCIES)[number];

export const ASC_LA_DESTINATION_KINDS = [
  "internal_runner",
  "external_url",
  "deep_link",
] as const;
export type AscLaDestinationKind = (typeof ASC_LA_DESTINATION_KINDS)[number];

export const ASC_LA_OPEN_MODES = ["same_tab", "new_tab", "side_panel"] as const;
export type AscLaOpenMode = (typeof ASC_LA_OPEN_MODES)[number];

// ── Target fields ─────────────────────────────────────────────────────────
export const ASC_LA_TARGET_FIELDS = [
  // Step 5
  "outcomes.add",
  // Step 6
  "notifications.add",
  // Step 7
  "destination.kind",
  "destination.externalUrl",
  "destination.deepLinkTemplate",
  "destination.openMode",
  "launch.slugCandidates",
] as const;
export type AscLaTargetField = (typeof ASC_LA_TARGET_FIELDS)[number];

export const ASC_LA_STEPS = [5, 6, 7] as const;
export type AscLaStep = (typeof ASC_LA_STEPS)[number];

// ── Proposal value shapes ─────────────────────────────────────────────────
export interface AscLaOutcomeValue {
  label: string;
  kind: AscLaOutcomeKind;
  note?: string;
}

export interface AscLaNotificationValue {
  outcomeRef: string;
  channelRef: string;
  audienceRef?: string;
  urgency: AscLaUrgency;
  note?: string;
}

export type AscLaProposalValue =
  | AscLaOutcomeValue
  | AscLaNotificationValue
  | AscLaDestinationKind
  | AscLaOpenMode
  | string
  | string[];

export interface AscLaProposalPayload {
  id: string;
  targetField: AscLaTargetField;
  value: AscLaProposalValue;
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface AscLaAdvisory {
  message: string;
}

export interface AscLogicArchitectResponse {
  step: AscLaStep;
  proposals: AscLaProposalPayload[];
  advisories: AscLaAdvisory[];
}

const TARGET_SET: ReadonlySet<string> = new Set(ASC_LA_TARGET_FIELDS);
const OUTCOME_KIND_SET: ReadonlySet<string> = new Set(ASC_LA_OUTCOME_KINDS);
const URGENCY_SET: ReadonlySet<string> = new Set(ASC_LA_URGENCIES);
const DEST_KIND_SET: ReadonlySet<string> = new Set(ASC_LA_DESTINATION_KINDS);
const OPEN_MODE_SET: ReadonlySet<string> = new Set(ASC_LA_OPEN_MODES);
const CONFIDENCE_SET = new Set(["high", "medium", "low"]);
const STEP_SET = new Set<number>([5, 6, 7]);

function isStringNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isValidValueForField(
  field: AscLaTargetField,
  v: unknown,
): v is AscLaProposalValue {
  switch (field) {
    case "outcomes.add": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return false;
      const o = v as Record<string, unknown>;
      if (!isStringNonEmpty(o.label)) return false;
      if (typeof o.kind !== "string" || !OUTCOME_KIND_SET.has(o.kind)) return false;
      if (o.note !== undefined && typeof o.note !== "string") return false;
      return true;
    }
    case "notifications.add": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return false;
      const o = v as Record<string, unknown>;
      if (!isStringNonEmpty(o.outcomeRef)) return false;
      if (!isStringNonEmpty(o.channelRef)) return false;
      if (o.audienceRef !== undefined && typeof o.audienceRef !== "string")
        return false;
      if (typeof o.urgency !== "string" || !URGENCY_SET.has(o.urgency))
        return false;
      if (o.note !== undefined && typeof o.note !== "string") return false;
      return true;
    }
    case "destination.kind":
      return typeof v === "string" && DEST_KIND_SET.has(v);
    case "destination.openMode":
      return typeof v === "string" && OPEN_MODE_SET.has(v);
    case "destination.externalUrl":
    case "destination.deepLinkTemplate":
      return isStringNonEmpty(v);
    case "launch.slugCandidates":
      return (
        Array.isArray(v) &&
        v.length > 0 &&
        v.every((x) => typeof x === "string" && x.length > 0)
      );
    default:
      return false;
  }
}

export function parseLogicArchitectResponse(
  raw: unknown,
): AscLogicArchitectResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.step !== "number" || !STEP_SET.has(r.step)) return null;
  const step = r.step as AscLaStep;

  if (!Array.isArray(r.proposals)) return null;
  const proposals: AscLaProposalPayload[] = [];
  for (const p of r.proposals) {
    if (!p || typeof p !== "object") return null;
    const pp = p as Record<string, unknown>;
    if (!isStringNonEmpty(pp.id)) return null;
    if (typeof pp.targetField !== "string" || !TARGET_SET.has(pp.targetField))
      return null;
    const tf = pp.targetField as AscLaTargetField;
    if (!isValidValueForField(tf, pp.value)) return null;
    if (typeof pp.confidence !== "string" || !CONFIDENCE_SET.has(pp.confidence))
      return null;
    if (typeof pp.rationale !== "string") return null;
    proposals.push({
      id: pp.id,
      targetField: tf,
      value: pp.value as AscLaProposalValue,
      confidence: pp.confidence as "high" | "medium" | "low",
      rationale: pp.rationale,
    });
  }

  const advisories: AscLaAdvisory[] = [];
  if (r.advisories !== undefined) {
    if (!Array.isArray(r.advisories)) return null;
    for (const a of r.advisories) {
      if (!a || typeof a !== "object") return null;
      const ao = a as Record<string, unknown>;
      if (!isStringNonEmpty(ao.message)) return null;
      if (ao.message.length > 240) return null;
      advisories.push({ message: ao.message });
    }
  }

  return { step, proposals, advisories };
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function normalizeOutcomeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugIsUnique(slug: string, takenSlugs: string[]): boolean {
  const n = normalizeSlug(slug);
  if (!n) return false;
  return !takenSlugs.map(normalizeSlug).includes(n);
}

export function notificationKey(v: AscLaNotificationValue): string {
  return [
    normalizeOutcomeLabel(v.outcomeRef),
    v.channelRef.trim().toLowerCase(),
    (v.audienceRef ?? "").trim().toLowerCase(),
  ].join("|");
}

/**
 * Per-step fieldSnapshot for the manual-wins-over-stale guard.
 * - outcomes.add → sorted normalized label set
 * - notifications.add → sorted notificationKey set
 * - destination.* → serialized current value of that subfield
 * - launch.slugCandidates → current slug (so manual slug edits stale candidates)
 */
export function snapshotForLaProposal(
  input: AscWizardInput,
  targetField: AscLaTargetField,
): string {
  switch (targetField) {
    case "outcomes.add":
      return JSON.stringify(
        (input.outcomesDraftEdits ?? [])
          .map((o) => normalizeOutcomeLabel(o.label))
          .sort(),
      );
    case "notifications.add":
      return JSON.stringify(
        (input.notificationsDraftEdits ?? [])
          .map((n) =>
            // flat AscNotificationEdit is a persistence bridge; the
            // canonical fields the UI cares about are trigger (≈outcomeRef)
            // and channel.
            [
              normalizeOutcomeLabel(n.trigger ?? ""),
              (n.channel ?? "").trim().toLowerCase(),
            ].join("|"),
          )
          .sort(),
      );
    case "destination.kind":
      return JSON.stringify(input.destination?.kind ?? "");
    case "destination.externalUrl":
      return JSON.stringify(input.destination?.externalUrl ?? "");
    case "destination.deepLinkTemplate":
      return JSON.stringify(input.destination?.deepLinkTemplate ?? "");
    case "destination.openMode":
      return JSON.stringify(input.destination?.openMode ?? "");
    case "launch.slugCandidates":
      return JSON.stringify(input.launch?.slug ?? "");
    default:
      return "";
  }
}

export function laTargetStep(field: AscLaTargetField): AscLaStep {
  if (field === "outcomes.add") return 5;
  if (field === "notifications.add") return 6;
  return 7;
}
