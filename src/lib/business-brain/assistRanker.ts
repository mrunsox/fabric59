/**
 * Business Brain — Live Runner Assist ranker (Phase 4).
 *
 * Pure ranker. Consumes approved-fact views + an AssistSessionContext and
 * produces a small (0–5) list of assist cards.
 *
 * Ranking spec (per approved scope):
 *   1) step relevance
 *   2) entity / service match
 *   3) confidence
 *   4) recency
 *
 * Quiet-mode rules: cards below thresholds are dropped. When context is weak
 * or no card meets the bar, returns < 5 cards (including 0). Snippets are
 * evidence/fallback only — facts are the spine.
 */
import type { ApprovedFactView } from "./selectors";
import type { AssistSessionContext, AssistStepKind } from "./assistContext";
import type { BbEntityType, BbVerificationState } from "./types";

export type AssistCardKind =
  | "intent_hint"
  | "intake_reminder"
  | "hours_guidance"
  | "escalation_guidance"
  | "destination_suggestion"
  | "phrasing_reminder";

export interface BbAssistCard {
  id: string;
  kind: AssistCardKind;
  factId: string;
  entityType: BbEntityType;
  title: string;
  /** One-line suggested action / reminder. Privacy-safe to render only. */
  action: string;
  snippet: string | null;
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  verificationState: BbVerificationState;
  lastReviewedAt: string;
  /** Final composed score for stable ordering. */
  score: number;
  /** Source ids backing the card (for deep links). */
  sourceIds: string[];
}

export interface RankerOptions {
  /** Hard cap on visible cards. Defaults to 5 (scope cap). */
  max?: number;
  /** Min step relevance required to surface. */
  minStepRelevance?: number;
  /** Min confidence required to surface (0..1). */
  minConfidence?: number;
}

const DEFAULT_MAX = 5;
const DEFAULT_MIN_STEP_RELEVANCE = 30;
const DEFAULT_MIN_CONFIDENCE = 0.4;
const WEAK_CONTEXT_MAX = 2;

// Step relevance scores (0–100) per (stepKind, entityType).
// Higher = more relevant for that step. 0 → not surfaced for that step.
const STEP_RELEVANCE: Record<AssistStepKind, Partial<Record<BbEntityType, number>>> = {
  intent: { faq: 100, service: 80, policy: 50 },
  intake: { intake_requirement: 100, service: 40, policy: 30 },
  hours: { hours: 100, escalation_contact: 50, policy: 30 },
  escalation: { escalation_contact: 100, hours: 60, policy: 40 },
  destination: { phone: 100, destination_contact: 90, escalation_contact: 40 },
  info: { policy: 80, faq: 60, service: 60 },
  unknown: { faq: 40, service: 40, policy: 30, hours: 30 },
};

const ENTITY_KIND: Record<BbEntityType, AssistCardKind> = {
  faq: "intent_hint",
  service: "intent_hint",
  intake_requirement: "intake_reminder",
  hours: "hours_guidance",
  escalation_contact: "escalation_guidance",
  phone: "destination_suggestion",
  destination_contact: "destination_suggestion",
  policy: "phrasing_reminder",
  // Not surfaced at runtime — staff/department are org structure facts.
  staff: "phrasing_reminder",
  department: "phrasing_reminder",
};

function bandOf(c: number): "high" | "medium" | "low" {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

function pickString(p: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function deriveTitleAndAction(f: ApprovedFactView): { title: string; action: string } {
  const p = f.payload;
  switch (f.entityType) {
    case "faq": {
      const q = pickString(p, "question") ?? f.displayName;
      const a = pickString(p, "answer");
      return { title: q.replace(/\?+$/, ""), action: a ? `Answer ready: ${a.slice(0, 80)}` : "Answer available in source" };
    }
    case "service": {
      const name = pickString(p, "name") ?? f.displayName;
      const desc = pickString(p, "description");
      return { title: name, action: desc ? `About: ${desc.slice(0, 80)}` : "Service details available" };
    }
    case "intake_requirement": {
      const label = pickString(p, "label") ?? f.displayName;
      // Render as a privacy-safe count + names hint; the fields list itself
      // is non-sensitive metadata describing what to capture, not the values.
      const fields = Array.isArray(p.fields) ? (p.fields as unknown[]).filter((x) => typeof x === "string") : [];
      return { title: label, action: fields.length ? `Capture: ${fields.join(", ")}` : "Capture required fields" };
    }
    case "hours": {
      const label = pickString(p, "label") ?? "Business hours";
      const schedule = pickString(p, "schedule");
      return { title: label, action: schedule ? `Hours: ${schedule}` : "Reference hours policy" };
    }
    case "escalation_contact": {
      const label = pickString(p, "label") ?? f.displayName;
      const ch = pickString(p, "channel") ?? "contact";
      return { title: `Escalate to ${label}`, action: `Use ${ch} escalation path` };
    }
    case "phone": {
      const label = pickString(p, "label") ?? f.displayName;
      return { title: `Route to ${label}`, action: "Transfer destination available" };
    }
    case "destination_contact": {
      const label = pickString(p, "label") ?? f.displayName;
      const ch = pickString(p, "channel") ?? "contact";
      return { title: `Route to ${label}`, action: `Reach via ${ch}` };
    }
    case "policy":
      return { title: f.displayName, action: "Policy reminder" };
    default:
      return { title: f.displayName, action: "Reference" };
  }
}

function matchScore(f: ApprovedFactView, ctx: AssistSessionContext): number {
  if (ctx.serviceHints.length === 0 && ctx.destinationHints.length === 0) return 0;
  const haystackBits: string[] = [f.displayName.toLowerCase()];
  for (const k of ["name", "label", "question"]) {
    const v = f.payload[k];
    if (typeof v === "string") haystackBits.push(v.toLowerCase());
  }
  const hay = haystackBits.join(" ");
  let s = 0;
  for (const h of ctx.serviceHints) {
    if (h && hay.includes(h)) s += 25;
  }
  for (const h of ctx.destinationHints) {
    if (h && hay.includes(h)) s += 20;
  }
  return Math.min(s, 60);
}

export function rankAssistCards(
  facts: ApprovedFactView[],
  ctx: AssistSessionContext,
  opts: RankerOptions = {},
): BbAssistCard[] {
  const max = opts.max ?? DEFAULT_MAX;
  const minStep = opts.minStepRelevance ?? DEFAULT_MIN_STEP_RELEVANCE;
  const minConf = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const stepTable = STEP_RELEVANCE[ctx.stepKind] ?? {};

  const cards: BbAssistCard[] = [];
  const seenFactIds = new Set<string>();
  for (const f of facts) {
    if (f.verificationState !== "approved") continue;
    if (seenFactIds.has(f.id)) continue;
    let stepRel = stepTable[f.entityType] ?? 0;
    // After-hours boost for hours-related entities, regardless of step.
    if (ctx.afterHours && (f.entityType === "hours" || f.entityType === "escalation_contact")) {
      stepRel = Math.max(stepRel, 70);
    }
    if (stepRel < minStep) continue;
    const conf = typeof f.confidenceAtReview === "number" ? f.confidenceAtReview : 0.9;
    if (conf < minConf) continue;
    const match = matchScore(f, ctx);
    const recencyMs = Date.parse(f.lastReviewedAt) || 0;
    // Composite score for ordering (lexicographic semantics enforced by
    // weights; later sort is stable by step → match → conf → recency).
    const score = stepRel * 1000 + match * 10 + conf * 1;
    const { title, action } = deriveTitleAndAction(f);
    cards.push({
      id: `assist:${f.id}`,
      kind: ENTITY_KIND[f.entityType] ?? "phrasing_reminder",
      factId: f.id,
      entityType: f.entityType,
      title,
      action,
      snippet: f.firstSnippet,
      confidence: conf,
      confidenceBand: bandOf(conf),
      verificationState: f.verificationState,
      lastReviewedAt: f.lastReviewedAt,
      score: score + recencyMs / 1e13,
      sourceIds: f.firstSourceId ? [f.firstSourceId] : [],
    });
    seenFactIds.add(f.id);
  }

  // Sort by spec: step relevance (encoded in score), then match, then conf, then recency.
  cards.sort((a, b) => b.score - a.score);

  // Quiet-mode: weak context → tighter cap. No step + no hints + not after-hours.
  const weak = !ctx.hasContext && ctx.serviceHints.length === 0 && ctx.destinationHints.length === 0 && !ctx.afterHours;
  const cap = weak ? Math.min(WEAK_CONTEXT_MAX, max) : max;
  return cards.slice(0, cap);
}

export const ASSIST_DEFAULTS = {
  MAX: DEFAULT_MAX,
  MIN_STEP_RELEVANCE: DEFAULT_MIN_STEP_RELEVANCE,
  MIN_CONFIDENCE: DEFAULT_MIN_CONFIDENCE,
  WEAK_CONTEXT_MAX,
} as const;
