/**
 * Business Brain — read-only bridge selectors (Phase 2).
 *
 * THIS FILE IS THE BRIDGE BOUNDARY. Downstream consumers (ASC, canonical
 * builder, agent workspace) MAY import the view-model types and async
 * selectors declared here, plus the per-step `build*Suggestions` helpers.
 * They MUST NOT import:
 *
 *   - raw bb_* table row types from src/integrations/supabase/types.ts
 *   - extraction internals (payload shapes, review actions)
 *   - hooks under src/hooks/useBusinessBrain*
 *   - pages under src/pages/workspace/brain/
 *
 * Phase 2 / Slice 1 wires real Supabase reads behind this surface so ASC
 * never needs to learn about `bb_*` tables. Writes are not exposed here and
 * never will be — this bridge is one-way (downstream → selectors).
 *
 * See docs/business-brain-architecture.md (Bridge rules).
 */
import { supabase } from "@/integrations/supabase/client";
import type { BbEntityType, BbVerificationState } from "./types";

/**
 * Workspace-scoped, read-only view of an approved fact. Intentionally narrow
 * — no DB row leaks through. Downstream code reads only these fields.
 */
export interface ApprovedFactView {
  id: string;
  workspaceId: string;
  clientId: string | null;
  entityType: BbEntityType;
  displayName: string;
  /** Frozen, denormalized payload. Treat as opaque per-entity-type. */
  payload: Readonly<Record<string, unknown>>;
  verificationState: BbVerificationState;
  confidenceAtReview: number | null;
  lastReviewedAt: string;
  sourceCount: number;
  /** First snippet from `source_refs`, if any. Used for card preview. */
  firstSnippet: string | null;
  /** First source id, used to fetch a friendly title on demand. */
  firstSourceId: string | null;
}

export interface ApprovedFactQuery {
  workspaceId: string;
  clientId?: string | null;
  entityType?: BbEntityType | BbEntityType[];
  limit?: number;
}

interface BbFactRowShape {
  id: string;
  workspace_id: string;
  client_id: string | null;
  entity_type: BbEntityType;
  display_name: string;
  payload: Record<string, unknown>;
  verification_state: BbVerificationState;
  confidence_at_review: number | null;
  last_reviewed_at: string;
  source_refs: Array<{
    source_id: string;
    extraction_id: string | null;
    snippet: string | null;
  }> | null;
}

function rowToView(row: BbFactRowShape): ApprovedFactView {
  const refs = row.source_refs ?? [];
  return Object.freeze({
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    entityType: row.entity_type,
    displayName: row.display_name,
    payload: Object.freeze({ ...(row.payload ?? {}) }),
    verificationState: row.verification_state,
    confidenceAtReview: row.confidence_at_review,
    lastReviewedAt: row.last_reviewed_at,
    sourceCount: refs.length,
    firstSnippet:
      refs.find((r) => typeof r.snippet === "string" && r.snippet)?.snippet ??
      null,
    firstSourceId: refs[0]?.source_id ?? null,
  });
}

/**
 * Lists approved (or needs-review) facts for a workspace. Never returns
 * `stale` or `superseded` rows. Ordered by `last_reviewed_at desc` so the
 * freshest reviewed facts come first.
 */
export async function listApprovedFacts(
  query: ApprovedFactQuery,
): Promise<ApprovedFactView[]> {
  if (!query.workspaceId) return [];
  const types = Array.isArray(query.entityType)
    ? query.entityType
    : query.entityType
      ? [query.entityType]
      : null;

  let q = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .select(
      "id,workspace_id,client_id,entity_type,display_name,payload,verification_state,confidence_at_review,last_reviewed_at,source_refs",
    )
    .eq("workspace_id", query.workspaceId)
    .in("verification_state", ["approved", "needs_review"])
    .order("last_reviewed_at", { ascending: false })
    .limit(query.limit ?? 100);

  if (query.clientId !== undefined) {
    q = query.clientId === null ? q.is("client_id", null) : q.eq("client_id", query.clientId);
  }
  if (types && types.length > 0) {
    q = q.in("entity_type", types);
  }

  const { data, error } = await q;
  if (error) return [];
  const rows = (data ?? []) as unknown as BbFactRowShape[];
  return rows.map(rowToView);
}

/**
 * Returns source titles + snippets behind a fact. Read-only; no writes.
 */
export async function getFactSourceRefs(
  factId: string,
): Promise<Array<{ sourceId: string; sourceTitle: string | null; snippet: string | null }>> {
  if (!factId) return [];
  const { data: fact, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .select("source_refs")
    .eq("id", factId)
    .maybeSingle();
  if (error || !fact) return [];
  const refs = ((fact as { source_refs?: Array<{ source_id: string; snippet: string | null }> })
    .source_refs ?? []) as Array<{ source_id: string; snippet: string | null }>;
  if (refs.length === 0) return [];
  const ids = Array.from(new Set(refs.map((r) => r.source_id)));
  const { data: sources } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_sources" as any)
    .select("id,title")
    .in("id", ids);
  const titleById = new Map<string, string>();
  for (const s of ((sources ?? []) as unknown) as Array<{ id: string; title: string }>) {
    titleById.set(s.id, s.title);
  }
  return refs.map((r) => ({
    sourceId: r.source_id,
    sourceTitle: titleById.get(r.source_id) ?? null,
    snippet: r.snippet,
  }));
}

// ────────────────────────────────────────────────────────────────────────
// ASC suggestion view-models (Phase 2)
// ────────────────────────────────────────────────────────────────────────

/**
 * The intent attached to a suggestion card's "Use" button. Every variant
 * maps 1:1 to an EXISTING ASC reducer action; downstream code is the only
 * place that translates these into reducer dispatches.
 *
 * Adding a new variant requires (a) a matching existing ASC action and
 * (b) a card surface that knows how to apply it. If neither exists, the
 * suggestion must not be surfaced — there is no clipboard fallback.
 */
export type BbAscApplyIntent =
  | {
      kind: "addCallerReason";
      label: string;
      opener?: string;
      requiredCapture?: string[];
    }
  | {
      kind: "appendRequiredCaptureToFirstReason";
      fields: string[];
    }
  | {
      kind: "addNotificationEdit";
      trigger: string;
      channel: string;
      note?: string;
    }
  | {
      kind: "setDestinationDeepLink";
      deepLinkTemplate: string;
      notes?: string;
    };

export type BbAscStep = 3 | 4 | 6 | 7;

export interface BbAscSuggestion {
  /** Stable id: `${step}:${factId}`. */
  id: string;
  step: BbAscStep;
  factId: string;
  entityType: BbEntityType;
  title: string;
  snippet: string | null;
  /** 0..1; mirrors fact.confidence_at_review (null → assume 0.9). */
  confidence: number;
  /** Bucket for display: high ≥0.8, medium 0.5–0.8, low <0.5. */
  confidenceBand: "high" | "medium" | "low";
  /** Static per (step, entity_type). Higher = more relevant for this step. */
  relevance: number;
  lastReviewedAt: string;
  sourceCount: number;
  apply: BbAscApplyIntent;
}

const CAP_PER_STEP = 5;

function bandOf(c: number): "high" | "medium" | "low" {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

function pickString(p: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pickStringArray(
  p: Readonly<Record<string, unknown>>,
  key: string,
): string[] | undefined {
  const v = p[key];
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

interface BuildOptions {
  /** Caller reasons already on the draft. Used to suppress dupes / require targets. */
  existingCallerReasonLabels?: string[];
  hasCallerReason?: boolean;
  /** Notifications already on the draft. Used to suppress dupes. */
  existingNotificationTriggers?: string[];
  /** Whether destination has already been set; suggestions still allowed (replace). */
  hasDestination?: boolean;
}

/** Step 3 — caller reasons from `faq` and `service`. */
export function buildCallerReasonSuggestions(
  facts: ApprovedFactView[],
  opts: BuildOptions = {},
): BbAscSuggestion[] {
  const existing = new Set(
    (opts.existingCallerReasonLabels ?? []).map((s) => s.toLowerCase().trim()),
  );
  const out: BbAscSuggestion[] = [];
  for (const f of facts) {
    if (f.entityType === "faq") {
      const question = pickString(f.payload, "question");
      const answer = pickString(f.payload, "answer");
      if (!question) continue;
      const label = question.replace(/\?+$/, "").slice(0, 80);
      if (existing.has(label.toLowerCase())) continue;
      out.push(makeSuggestion(3, f, {
        relevance: 100,
        title: label,
        snippet: answer ?? f.firstSnippet,
        apply: { kind: "addCallerReason", label, opener: answer?.slice(0, 200) },
      }));
    } else if (f.entityType === "service") {
      const name = pickString(f.payload, "name");
      if (!name) continue;
      const label = `Asking about ${name}`;
      if (existing.has(label.toLowerCase())) continue;
      out.push(makeSuggestion(3, f, {
        relevance: 70,
        title: label,
        snippet: pickString(f.payload, "description") ?? f.firstSnippet,
        apply: { kind: "addCallerReason", label },
      }));
    }
  }
  return rankAndCap(out);
}

/**
 * Step 4 — intake requirements appended to the FIRST existing caller reason's
 * `requiredCapture`. If no caller reasons exist on the draft, returns []
 * (clean-mapping rule: no target → not surfaced).
 */
export function buildIntakeRequirementSuggestions(
  facts: ApprovedFactView[],
  opts: BuildOptions = {},
): BbAscSuggestion[] {
  if (!opts.hasCallerReason) return [];
  const out: BbAscSuggestion[] = [];
  for (const f of facts) {
    if (f.entityType !== "intake_requirement") continue;
    const label = pickString(f.payload, "label");
    const fields = pickStringArray(f.payload, "fields");
    if (!label || !fields) continue;
    out.push(makeSuggestion(4, f, {
      relevance: 100,
      title: label,
      snippet: fields.join(", "),
      apply: { kind: "appendRequiredCaptureToFirstReason", fields },
    }));
  }
  return rankAndCap(out);
}

/** Step 6 — notifications from `hours` + `escalation_contact`. */
export function buildEscalationSuggestions(
  facts: ApprovedFactView[],
  opts: BuildOptions = {},
): BbAscSuggestion[] {
  const existing = new Set(
    (opts.existingNotificationTriggers ?? []).map((s) => s.toLowerCase().trim()),
  );
  const out: BbAscSuggestion[] = [];
  for (const f of facts) {
    if (f.entityType === "escalation_contact") {
      const label = pickString(f.payload, "label");
      const value = pickString(f.payload, "value");
      const channel = pickString(f.payload, "channel") ?? "email";
      const trigger =
        pickString(f.payload, "triggerCondition") ?? `Escalation: ${label ?? value ?? ""}`;
      if (!value || existing.has(trigger.toLowerCase())) continue;
      out.push(makeSuggestion(6, f, {
        relevance: 100,
        title: `Escalate to ${label ?? value}`,
        snippet: f.firstSnippet ?? `${channel}: ${value}`,
        apply: {
          kind: "addNotificationEdit",
          trigger,
          channel,
          note: value,
        },
      }));
    } else if (f.entityType === "hours") {
      const label = pickString(f.payload, "label") ?? "Business hours";
      const trigger = `After hours (${label})`;
      if (existing.has(trigger.toLowerCase())) continue;
      const schedule = pickString(f.payload, "schedule");
      out.push(makeSuggestion(6, f, {
        relevance: 70,
        title: `After-hours notify (${label})`,
        snippet: schedule ?? f.firstSnippet,
        apply: {
          kind: "addNotificationEdit",
          trigger,
          channel: "email",
          note: schedule,
        },
      }));
    }
  }
  return rankAndCap(out);
}

/** Step 7 — destinations from `phone` + `destination_contact`. */
export function buildDestinationSuggestions(
  facts: ApprovedFactView[],
  _opts: BuildOptions = {},
): BbAscSuggestion[] {
  const out: BbAscSuggestion[] = [];
  for (const f of facts) {
    if (f.entityType === "phone") {
      const label = pickString(f.payload, "label");
      const number = pickString(f.payload, "number");
      if (!number) continue;
      const digits = number.replace(/[^0-9+]/g, "");
      out.push(makeSuggestion(7, f, {
        relevance: 100,
        title: `Route to ${label ?? number}`,
        snippet: f.firstSnippet ?? number,
        apply: {
          kind: "setDestinationDeepLink",
          deepLinkTemplate: `tel:${digits}`,
          notes: label ?? undefined,
        },
      }));
    } else if (f.entityType === "destination_contact") {
      const label = pickString(f.payload, "label");
      const channel = pickString(f.payload, "channel");
      const value = pickString(f.payload, "value");
      if (!value) continue;
      let template = value;
      if (channel === "phone" || channel === "sms") template = `tel:${value.replace(/[^0-9+]/g, "")}`;
      else if (channel === "email") template = `mailto:${value}`;
      out.push(makeSuggestion(7, f, {
        relevance: 80,
        title: `Route to ${label ?? value}`,
        snippet: f.firstSnippet ?? value,
        apply: {
          kind: "setDestinationDeepLink",
          deepLinkTemplate: template,
          notes: label ?? undefined,
        },
      }));
    }
  }
  return rankAndCap(out);
}

function makeSuggestion(
  step: BbAscStep,
  f: ApprovedFactView,
  override: {
    relevance: number;
    title: string;
    snippet: string | null | undefined;
    apply: BbAscApplyIntent;
  },
): BbAscSuggestion {
  const c = typeof f.confidenceAtReview === "number" ? f.confidenceAtReview : 0.9;
  return {
    id: `${step}:${f.id}`,
    step,
    factId: f.id,
    entityType: f.entityType,
    title: override.title,
    snippet: override.snippet ?? null,
    confidence: c,
    confidenceBand: bandOf(c),
    relevance: override.relevance,
    lastReviewedAt: f.lastReviewedAt,
    sourceCount: f.sourceCount,
    apply: override.apply,
  };
}

/** Rank by relevance desc → confidence desc → recency desc; cap at 5. */
function rankAndCap(items: BbAscSuggestion[]): BbAscSuggestion[] {
  const sorted = [...items].sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (
      new Date(b.lastReviewedAt).getTime() - new Date(a.lastReviewedAt).getTime()
    );
  });
  return sorted.slice(0, CAP_PER_STEP);
}

/** Maps an ASC step number → the entity types that step pulls from. */
export const BB_STEP_ENTITY_TYPES: Record<BbAscStep, BbEntityType[]> = {
  3: ["faq", "service"],
  4: ["intake_requirement"],
  6: ["hours", "escalation_contact"],
  7: ["phone", "destination_contact"],
};

export const BB_SUGGESTION_CAP_PER_STEP = CAP_PER_STEP;

// ────────────────────────────────────────────────────────────────────────
// Phase 3 — Internal search (Business Brain Search tab)
//
// These selectors are part of the bridge surface but are intended for the
// Business Brain UI ONLY. ASC and other downstream consumers must not call
// search APIs from this phase — those are operator/admin retrieval flows.
// ────────────────────────────────────────────────────────────────────────

export interface BbSearchEvidence {
  sourceId: string;
  sourceTitle: string | null;
  sourceKind: string | null;
  snippet: string;
}

export interface BbSearchCard {
  /** "fact" cards are primary; "chunk" cards are orphan evidence. */
  kind: "fact" | "chunk";
  id: string;
  entityType: BbEntityType | null;
  title: string;
  snippet: string | null;
  evidence: BbSearchEvidence[];
  score: number;
  confidence: number | null;
  confidenceBand: "high" | "medium" | "low" | null;
  verificationState: BbVerificationState | null;
  lastReviewedAt: string | null;
  /** Stable id of the underlying fact, if this card represents an approved fact. */
  factId: string | null;
}

export interface BbSearchInput {
  workspaceId: string;
  clientId?: string | null;
  query: string;
  entityTypes?: BbEntityType[];
  sourceKinds?: string[];
  includeNeedsReview?: boolean;
  limit?: number;
}

export interface BbSearchResponse {
  cards: BbSearchCard[];
  groups: Record<string, BbSearchCard[]>;
  counts: { facts: number; chunks: number; total: number };
  latencyMs: number;
  model: string;
}

/**
 * Calls the `bb-search` edge function and normalizes the response into
 * view-model shapes. Empty/invalid inputs short-circuit to an empty
 * response so consumers do not need to guard on every call.
 */
export async function searchApprovedKnowledge(
  input: BbSearchInput,
): Promise<BbSearchResponse> {
  const empty: BbSearchResponse = {
    cards: [],
    groups: {},
    counts: { facts: 0, chunks: 0, total: 0 },
    latencyMs: 0,
    model: "",
  };
  if (!input.workspaceId || !input.query?.trim()) return empty;
  const { data, error } = await supabase.functions.invoke("bb-search", {
    body: {
      workspaceId: input.workspaceId,
      clientId: input.clientId ?? null,
      query: input.query.trim(),
      filters: {
        entityTypes: input.entityTypes ?? null,
        sourceKinds: input.sourceKinds ?? null,
        includeNeedsReview: input.includeNeedsReview === true,
      },
      limit: input.limit ?? 10,
    },
  });
  if (error || !data || (data as { ok?: boolean }).ok === false) return empty;
  const payload = data as {
    cards?: BbSearchCard[];
    groups?: Record<string, BbSearchCard[]>;
    counts?: { facts: number; chunks: number; total: number };
    latency_ms?: number;
    model?: string;
  };
  const cards = (payload.cards ?? []).map((c) => ({
    ...c,
    confidenceBand:
      c.confidence == null
        ? null
        : c.confidence >= 0.8
          ? "high"
          : c.confidence >= 0.5
            ? "medium"
            : "low",
  })) as BbSearchCard[];
  // Re-group on the client (normalize "_evidence" bucket name).
  const groups: Record<string, BbSearchCard[]> = {};
  for (const c of cards) {
    const key = c.kind === "fact" ? c.entityType ?? "_other" : "_evidence";
    (groups[key] ||= []).push(c);
  }
  return {
    cards,
    groups,
    counts: payload.counts ?? { facts: 0, chunks: 0, total: cards.length },
    latencyMs: payload.latency_ms ?? 0,
    model: payload.model ?? "",
  };
}

/** Admin-gated reindex trigger. */
export async function triggerBbBackfill(
  workspaceId: string,
): Promise<{ ok: boolean; facts: number; chunks: number; failed: number }> {
  if (!workspaceId) return { ok: false, facts: 0, chunks: 0, failed: 0 };
  const { data, error } = await supabase.functions.invoke("bb-embed", {
    body: { workspaceId, mode: "backfill", target: "both", limit: 50 },
  });
  if (error || !data) return { ok: false, facts: 0, chunks: 0, failed: 0 };
  const r = data as { ok?: boolean; facts?: { embedded: number; failed: number }; chunks?: { embedded: number; failed: number } };
  return {
    ok: r.ok === true,
    facts: r.facts?.embedded ?? 0,
    chunks: r.chunks?.embedded ?? 0,
    failed: (r.facts?.failed ?? 0) + (r.chunks?.failed ?? 0),
  };
}
