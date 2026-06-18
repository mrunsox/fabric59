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
import type {
  BbEntityType,
  BbVerificationState,
  BbVerticalCoverage,
  BbVerticalGap,
  VerticalGapKind,
  VerticalProfile,
} from "./types";

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

// ────────────────────────────────────────────────────────────────────────
// Phase 4 — Live Runner Assist
//
// Bridge entry for the live call runner. Returns approved facts the assist
// ranker can score against. Read-only — never mutates anything. The runner
// is the ONLY downstream that may import this selector; ASC must not.
// ────────────────────────────────────────────────────────────────────────

const ASSIST_ENTITY_TYPES: BbEntityType[] = [
  "faq",
  "service",
  "intake_requirement",
  "hours",
  "escalation_contact",
  "phone",
  "destination_contact",
  "policy",
];

export interface BbAssistFactsInput {
  workspaceId: string;
  clientId?: string | null;
  limit?: number;
}

/**
 * Approved-only facts for the runtime assist surface. Excludes
 * `needs_review` and `stale`. Caller (ranker) applies relevance + thresholds.
 */
export async function getAssistFactsForSession(
  input: BbAssistFactsInput,
): Promise<ApprovedFactView[]> {
  if (!input.workspaceId) return [];
  const facts = await listApprovedFacts({
    workspaceId: input.workspaceId,
    clientId: input.clientId === undefined ? undefined : input.clientId,
    entityType: ASSIST_ENTITY_TYPES,
    limit: input.limit ?? 80,
  });
  return facts.filter((f) => f.verificationState === "approved");
}

/**
 * Deep link to the approved fact within the Business Brain UI. The page
 * may scroll/highlight the fact when it reads `?fact=<id>`.
 */
export function buildBbFactDeepLink(workspaceId: string, factId: string): string {
  if (!workspaceId || !factId) return "";
  return `/w/${workspaceId}/brain/approved?fact=${encodeURIComponent(factId)}`;
}

/**
 * Deep link to the source artifact behind a fact (when sourceId is known).
 * Falls back to the approved-knowledge view when no source is available.
 */
export function buildBbSourceDeepLink(
  workspaceId: string,
  sourceId: string | null,
): string {
  if (!workspaceId) return "";
  if (!sourceId) return `/w/${workspaceId}/brain/approved`;
  return `/w/${workspaceId}/brain/bin?source=${encodeURIComponent(sourceId)}`;
}

// ────────────────────────────────────────────────────────────────────────
// Phase 5 — Governance (staleness, conflicts, usage)
//
// Bridge entries for the Business Brain Governance surfaces. These are
// scoped to the Business Brain UI ONLY — ASC/runner must not import them
// (enforced by bbGovernanceBoundary.test.ts).
// ────────────────────────────────────────────────────────────────────────

import type {
  BbConflictKind,
  BbConflictStatus,
  BbStaleReason,
  BbStaleState,
} from "./types";

export interface StaleFactView {
  id: string;
  workspaceId: string;
  entityType: BbEntityType;
  displayName: string;
  staleState: BbStaleState;
  staleReasons: BbStaleReason[];
  lastReviewedAt: string;
  lastUsedAt: string | null;
  intervalDays: number | null;
  usageScore: number;
  /** Component signals so reviewers can see what drove prioritization. */
  usageBreakdown: {
    searchOpens: number;
    searchMarkedUseful: number;
    searchMarkedNotUseful: number;
    ascUsed: number;
    ascDismissed: number;
    assistOpened: number;
    assistCopied: number;
    assistInserted: number;
  };
}

export interface ConflictView {
  id: string;
  workspaceId: string;
  primaryFactId: string;
  conflictingFactId: string;
  conflictKind: BbConflictKind;
  entityType: BbEntityType;
  status: BbConflictStatus;
  similarity: number | null;
  details: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
  primaryFact: ApprovedFactView | null;
  conflictingFact: ApprovedFactView | null;
}

interface StaleFactsQuery {
  workspaceId: string;
  staleStates?: BbStaleState[];
  entityType?: BbEntityType;
  highRiskOnly?: boolean;
  limit?: number;
}

const EMPTY_BREAKDOWN = {
  searchOpens: 0,
  searchMarkedUseful: 0,
  searchMarkedNotUseful: 0,
  ascUsed: 0,
  ascDismissed: 0,
  assistOpened: 0,
  assistCopied: 0,
  assistInserted: 0,
};

export async function listStaleFacts(q: StaleFactsQuery): Promise<StaleFactView[]> {
  if (!q.workspaceId) return [];
  let base = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .select(
      "id,workspace_id,entity_type,display_name,stale_state,stale_reasons,last_reviewed_at,last_used_at,expected_review_interval_days",
    )
    .eq("workspace_id", q.workspaceId)
    .eq("verification_state", "approved")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(q.limit ?? 200);
  const states = q.staleStates && q.staleStates.length
    ? q.staleStates
    : (["stale_due_to_age", "stale_due_to_usage", "stale_due_to_conflict"] as BbStaleState[]);
  base = base.in("stale_state", states);
  if (q.entityType) base = base.eq("entity_type", q.entityType);
  const { data, error } = await base;
  if (error || !data) return [];
  const rows = data as unknown as unknown as Array<{
    id: string;
    workspace_id: string;
    entity_type: BbEntityType;
    display_name: string;
    stale_state: BbStaleState;
    stale_reasons: BbStaleReason[] | null;
    last_reviewed_at: string;
    last_used_at: string | null;
    expected_review_interval_days: number | null;
  }>;

  let defaults = new Map<string, { interval: number; highRisk: boolean }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: defs } = await supabase.from("bb_fact_entity_defaults" as any).select("*");
  for (const d of (((defs ?? []) as unknown) as Array<{ entity_type: string; default_review_interval_days: number; high_risk: boolean }>)) {
    defaults.set(d.entity_type, { interval: d.default_review_interval_days, highRisk: d.high_risk });
  }

  const filteredRows = q.highRiskOnly
    ? rows.filter((r) => defaults.get(r.entity_type)?.highRisk)
    : rows;

  const ids = filteredRows.map((r) => r.id);
  const usageById = new Map<string, Record<string, number> & { last_used_at: string | null; usage_score: number }>();
  if (ids.length) {
    const { data: usage } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("bb_fact_usage" as any)
      .select("*")
      .in("fact_id", ids);
    for (const u of (((usage ?? []) as unknown) as Array<Record<string, unknown> & { fact_id: string }>)) {
      usageById.set(u.fact_id, u as never);
    }
  }

  return filteredRows.map((r) => {
    const u = usageById.get(r.id);
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      entityType: r.entity_type,
      displayName: r.display_name,
      staleState: r.stale_state,
      staleReasons: (r.stale_reasons ?? []) as BbStaleReason[],
      lastReviewedAt: r.last_reviewed_at,
      lastUsedAt: r.last_used_at,
      intervalDays: r.expected_review_interval_days ?? defaults.get(r.entity_type)?.interval ?? null,
      usageScore: Number(u?.usage_score ?? 0),
      usageBreakdown: u
        ? {
            searchOpens: Number(u.search_opens ?? 0),
            searchMarkedUseful: Number(u.search_marked_useful ?? 0),
            searchMarkedNotUseful: Number(u.search_marked_not_useful ?? 0),
            ascUsed: Number(u.asc_suggestion_used ?? 0),
            ascDismissed: Number(u.asc_suggestion_dismissed ?? 0),
            assistOpened: Number(u.assist_opened ?? 0),
            assistCopied: Number(u.assist_copied ?? 0),
            assistInserted: Number(u.assist_inserted ?? 0),
          }
        : EMPTY_BREAKDOWN,
    };
  });
}

export async function listConflicts(workspaceId: string, status: BbConflictStatus = "open"): Promise<ConflictView[]> {
  if (!workspaceId) return [];
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_fact_conflicts" as any)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const rows = data as unknown as unknown as Array<{
    id: string;
    workspace_id: string;
    primary_fact_id: string;
    conflicting_fact_id: string;
    conflict_kind: BbConflictKind;
    entity_type: BbEntityType;
    status: BbConflictStatus;
    similarity: number | null;
    details: Record<string, unknown>;
    created_at: string;
    resolved_at: string | null;
  }>;

  const factIds = Array.from(new Set(rows.flatMap((r) => [r.primary_fact_id, r.conflicting_fact_id])));
  const factById = new Map<string, ApprovedFactView>();
  if (factIds.length) {
    const { data: facts } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("bb_facts" as any)
      .select(
        "id,workspace_id,client_id,entity_type,display_name,payload,verification_state,confidence_at_review,last_reviewed_at,source_refs",
      )
      .in("id", factIds);
    for (const f of ((facts ?? []) as unknown) as BbFactRowShape[]) {
      factById.set(f.id, rowToView(f));
    }
  }

  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    primaryFactId: r.primary_fact_id,
    conflictingFactId: r.conflicting_fact_id,
    conflictKind: r.conflict_kind,
    entityType: r.entity_type,
    status: r.status,
    similarity: r.similarity,
    details: r.details ?? {},
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    primaryFact: factById.get(r.primary_fact_id) ?? null,
    conflictingFact: factById.get(r.conflicting_fact_id) ?? null,
  }));
}

/**
 * Marks a fact as just reviewed: bumps last_reviewed_at and strips
 * age/usage reasons. Conflict reasons are PRESERVED — explicit conflict
 * resolution is the only path that clears them.
 */
export async function markFactReviewed(factId: string): Promise<boolean> {
  if (!factId) return false;
  const { data: fact, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .select("stale_reasons")
    .eq("id", factId)
    .maybeSingle();
  if (error || !fact) return false;
  const prev = new Set<string>(((fact as { stale_reasons?: string[] }).stale_reasons ?? []));
  prev.delete("stale_due_to_age");
  prev.delete("stale_due_to_usage");
  const reasonsArr = Array.from(prev).sort();
  const nextState = reasonsArr.includes("stale_due_to_conflict") ? "stale_due_to_conflict" : "fresh";
  const { error: updErr } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .update({
      last_reviewed_at: new Date().toISOString(),
      stale_reasons: reasonsArr,
      stale_state: nextState,
    })
    .eq("id", factId);
  return !updErr;
}

/** Flips fact to needs_review without clearing conflict reasons. */
export async function markFactNeedsUpdate(factId: string): Promise<boolean> {
  if (!factId) return false;
  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_facts" as any)
    .update({ verification_state: "needs_review" })
    .eq("id", factId);
  return !error;
}

export async function resolveConflict(
  conflictId: string,
  resolution: "supersede" | "keep_both" | "dismiss",
): Promise<boolean> {
  if (!conflictId) return false;
  const status: BbConflictStatus = resolution === "dismiss" ? "dismissed" : "resolved";
  const { data: conflict, error: readErr } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_fact_conflicts" as any)
    .select("primary_fact_id,conflicting_fact_id,workspace_id")
    .eq("id", conflictId)
    .maybeSingle();
  if (readErr || !conflict) return false;
  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_fact_conflicts" as any)
    .update({
      status,
      resolution,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", conflictId);
  if (error) return false;

  // Clear conflict reason from facts that no longer have any open conflicts.
  const c = conflict as unknown as { primary_fact_id: string; conflicting_fact_id: string };
  const factIds = [c.primary_fact_id, c.conflicting_fact_id];
  for (const fid of factIds) {
    const { data: open } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("bb_fact_conflicts" as any)
      .select("id")
      .eq("status", "open")
      .or(`primary_fact_id.eq.${fid},conflicting_fact_id.eq.${fid}`)
      .limit(1);
    if ((open ?? []).length === 0) {
      const { data: f } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_facts" as any)
        .select("stale_reasons")
        .eq("id", fid)
        .maybeSingle();
      const cur = new Set<string>(((f as { stale_reasons?: string[] } | null)?.stale_reasons) ?? []);
      cur.delete("stale_due_to_conflict");
      const arr = Array.from(cur).sort();
      const state =
        arr.includes("stale_due_to_usage")
          ? "stale_due_to_usage"
          : arr.includes("stale_due_to_age")
            ? "stale_due_to_age"
            : "fresh";
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_facts" as any)
        .update({ stale_reasons: arr, stale_state: state })
        .eq("id", fid);
    }
  }

  // Supersede: mark primary as needs_review so reviewers can pick the winner.
  if (resolution === "supersede") {
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("bb_facts" as any)
      .update({ verification_state: "needs_review" })
      .eq("id", c.primary_fact_id);
  }
  return true;
}

export async function triggerGovernanceSweep(
  workspaceId: string,
): Promise<{ ok: boolean }> {
  if (!workspaceId) return { ok: false };
  try {
    await supabase.functions.invoke("bb-usage-rollup", { body: { workspaceId } });
    await supabase.functions.invoke("bb-detect-conflicts", { body: { workspaceId } });
    await supabase.functions.invoke("bb-maintain-facts", { body: { workspaceId } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ===================================================================
// Phase 6 — Vertical skins & required-entity schemas
// ===================================================================

export interface VerticalGapFilter {
  gapKind?: VerticalGapKind;
  entityType?: BbEntityType;
  highPriorityOnly?: boolean;
  status?: "open" | "resolved" | "suppressed";
}

/** Returns the workspace's assigned vertical profile, or null. */
export async function getWorkspaceVerticalProfile(
  workspaceId: string,
): Promise<VerticalProfile | null> {
  if (!workspaceId) return null;
  const { data } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_workspace_vertical_profiles" as any)
    .select("vertical_profile_id")
    .eq("workspace_id", workspaceId)
    .is("client_id", null)
    .maybeSingle();
  const profileId = (data as { vertical_profile_id?: string } | null)
    ?.vertical_profile_id;
  if (!profileId) return null;
  const { data: profile } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_profiles" as any)
    .select("id,slug,label,description")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return null;
  const p = profile as unknown as { id: string; slug: string; label: string; description: string | null };
  return { id: p.id, slug: p.slug, label: p.label, description: p.description };
}

/** Returns per-required-entity-type coverage rows for the workspace. */
export async function getVerticalCoverageSummary(
  workspaceId: string,
): Promise<BbVerticalCoverage[]> {
  if (!workspaceId) return [];
  const profile = await getWorkspaceVerticalProfile(workspaceId);
  if (!profile) return [];
  const { data: reqs } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_entity_requirements" as any)
    .select("entity_type,is_required,min_count,high_priority")
    .eq("vertical_profile_id", profile.id);
  const required = ((reqs ?? []) as unknown as Array<{
    entity_type: string;
    is_required: boolean;
    min_count: number;
    high_priority: boolean;
  }>).filter((r) => r.is_required && r.min_count > 0);
  const highByType = new Map(required.map((r) => [r.entity_type, r.high_priority]));
  const typesIncluded = new Set(required.map((r) => r.entity_type));

  const { data: rows } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_completeness" as any)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("vertical_profile_id", profile.id);

  return ((rows ?? []) as unknown as Array<{
    workspace_id: string;
    vertical_profile_id: string;
    entity_type: string;
    required_count: number;
    actual_count: number;
    coverage_ratio: number | string;
    last_computed_at: string;
  }>)
    .filter((r) => typesIncluded.has(r.entity_type))
    .map((r) => ({
      workspaceId: r.workspace_id,
      verticalProfileId: r.vertical_profile_id,
      entityType: r.entity_type as BbEntityType,
      requiredCount: r.required_count,
      actualCount: r.actual_count,
      coverageRatio: Number(r.coverage_ratio),
      highPriority: highByType.get(r.entity_type) ?? false,
      lastComputedAt: r.last_computed_at,
    }))
    .sort(
      (a, b) =>
        Number(b.highPriority) - Number(a.highPriority) ||
        a.entityType.localeCompare(b.entityType),
    );
}

/** Lists vertical gaps with filters. Defaults to status=open. */
export async function listVerticalGaps(
  workspaceId: string,
  filter: VerticalGapFilter = {},
): Promise<BbVerticalGap[]> {
  if (!workspaceId) return [];
  const profile = await getWorkspaceVerticalProfile(workspaceId);
  if (!profile) return [];
  let q = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_gaps" as any)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("vertical_profile_id", profile.id)
    .eq("status", filter.status ?? "open")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter.gapKind) q = q.eq("gap_kind", filter.gapKind);
  if (filter.entityType) q = q.eq("entity_type", filter.entityType);
  const { data: rows } = await q;

  // Join high-priority + hint via requirement tables.
  const { data: entityReqs } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_entity_requirements" as any)
    .select("entity_type,high_priority")
    .eq("vertical_profile_id", profile.id);
  const highByType = new Map(
    ((entityReqs ?? []) as unknown as Array<{ entity_type: string; high_priority: boolean }>).map(
      (r) => [r.entity_type, r.high_priority],
    ),
  );
  const { data: fieldReqs } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_field_requirements" as any)
    .select("entity_type,field_path,validation_hint")
    .eq("vertical_profile_id", profile.id);
  const hintMap = new Map<string, string>();
  for (const fr of (fieldReqs ?? []) as unknown as Array<{
    entity_type: string;
    field_path: string;
    validation_hint: string | null;
  }>) {
    hintMap.set(`${fr.entity_type}|${fr.field_path}`, fr.validation_hint ?? "");
  }

  let out = ((rows ?? []) as unknown as Array<{
    id: string;
    workspace_id: string;
    vertical_profile_id: string;
    entity_type: string;
    gap_kind: VerticalGapKind;
    fact_id: string | null;
    field_path: string | null;
    status: "open" | "resolved" | "suppressed";
    created_at: string;
    resolved_at: string | null;
    suppressed_at: string | null;
  }>).map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    verticalProfileId: r.vertical_profile_id,
    entityType: r.entity_type as BbEntityType,
    gapKind: r.gap_kind,
    factId: r.fact_id,
    fieldPath: r.field_path,
    validationHint: r.field_path
      ? hintMap.get(`${r.entity_type}|${r.field_path}`) ?? null
      : null,
    status: r.status,
    highPriority: highByType.get(r.entity_type) ?? false,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    suppressedAt: r.suppressed_at,
  }));
  if (filter.highPriorityOnly) out = out.filter((g) => g.highPriority);
  return out;
}

/** Marks a single gap as suppressed (sticky; not reopened by future runs). */
export async function suppressVerticalGap(gapId: string): Promise<boolean> {
  if (!gapId) return false;
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id ?? null;
  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_vertical_gaps" as any)
    .update({
      status: "suppressed",
      suppressed_at: new Date().toISOString(),
      suppressed_by: userId,
    })
    .eq("id", gapId);
  return !error;
}

/** Manually trigger a vertical coverage / gap evaluation for a workspace. */
export async function triggerVerticalEvaluation(
  workspaceId: string,
): Promise<{ ok: boolean }> {
  if (!workspaceId) return { ok: false };
  try {
    await supabase.functions.invoke("bb-evaluate-vertical", {
      body: { workspaceId },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ===================================================================
// Phase 7 — Demand-driven gap detection (governance-side selectors)
//
// NOTE: gap *signal logging* (insert into bb_gap_events) is intentionally
// kept in `./gapLogging.ts` so ASC/runner code can import a small,
// dependency-free helper without pulling in governance surfaces. THIS file
// owns governance reads + reviewer actions, and ASC/runner code must NOT
// import from here (enforced by bbGapBoundary.test.ts).
// ===================================================================

import type { GapChannel } from "./gapLogging";

export interface BbGapTopicView {
  id: string;
  workspaceId: string;
  canonicalQuestion: string;
  entityTypeHint: string | null;
  verticalRequirementHint: string | null;
  openEventCount: number;
  channels: GapChannel[];
  status: "open" | "linked" | "dismissed" | "suppressed" | "pruned";
  statusReason: string | null;
  linkedFactId: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface GapTopicFilter {
  channel?: GapChannel;
  entityTypeHint?: string;
  sinceDays?: number;
  status?: "open" | "linked" | "dismissed" | "suppressed" | "pruned";
}

export async function listGapTopics(
  workspaceId: string,
  filter: GapTopicFilter = {},
): Promise<BbGapTopicView[]> {
  if (!workspaceId) return [];
  let q = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_gap_topics" as any)
    .select(
      "id,workspace_id,canonical_question,entity_type_hint,vertical_requirement_hint,open_event_count,channels,status,status_reason,linked_fact_id,last_seen_at,created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", filter.status ?? "open")
    .order("open_event_count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(200);
  if (filter.entityTypeHint) q = q.eq("entity_type_hint", filter.entityTypeHint);
  if (filter.channel) q = q.contains("channels", [filter.channel]);
  if (filter.sinceDays && filter.sinceDays > 0) {
    const since = new Date(Date.now() - filter.sinceDays * 86400_000).toISOString();
    q = q.gte("last_seen_at", since);
  }
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    workspace_id: string;
    canonical_question: string;
    entity_type_hint: string | null;
    vertical_requirement_hint: string | null;
    open_event_count: number;
    channels: string[] | null;
    status: BbGapTopicView["status"];
    status_reason: string | null;
    linked_fact_id: string | null;
    last_seen_at: string;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    canonicalQuestion: r.canonical_question,
    entityTypeHint: r.entity_type_hint,
    verticalRequirementHint: r.vertical_requirement_hint,
    openEventCount: r.open_event_count,
    channels: ((r.channels ?? []) as GapChannel[]).filter((c) =>
      c === "search" || c === "asc" || c === "assist",
    ),
    status: r.status,
    statusReason: r.status_reason,
    linkedFactId: r.linked_fact_id,
    lastSeenAt: r.last_seen_at,
    createdAt: r.created_at,
  }));
}

async function setGapTopicStatus(
  gapTopicId: string,
  status: "dismissed" | "suppressed" | "linked",
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  if (!gapTopicId) return false;
  const { data: userResult } = await supabase.auth.getUser();
  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bb_gap_topics" as any)
    .update({
      status,
      acted_by: userResult.user?.id ?? null,
      ...extra,
    })
    .eq("id", gapTopicId);
  return !error;
}

export function dismissGapTopic(gapTopicId: string): Promise<boolean> {
  return setGapTopicStatus(gapTopicId, "dismissed", { status_reason: "reviewer_dismissed" });
}

export function suppressGapTopic(gapTopicId: string): Promise<boolean> {
  return setGapTopicStatus(gapTopicId, "suppressed", { status_reason: "reviewer_suppressed" });
}

export function linkGapTopicToFact(
  gapTopicId: string,
  factId: string,
): Promise<boolean> {
  if (!factId) return Promise.resolve(false);
  return setGapTopicStatus(gapTopicId, "linked", {
    linked_fact_id: factId,
    status_reason: "reviewer_linked",
  });
}

/**
 * Build a deep link to the Approved Knowledge page with prefill params for a
 * draft fact. Phase 7 stays strictly draft-only: this is just a URL — no
 * fact is written. The destination page handles the prefilled editor.
 */
export function buildFactDraftLinkFromGap(
  workspaceId: string,
  topic: BbGapTopicView,
): string {
  if (!workspaceId || !topic) return "";
  const params = new URLSearchParams();
  params.set("newDraft", "1");
  params.set("fromGap", topic.id);
  if (topic.entityTypeHint) params.set("entity", topic.entityTypeHint);
  params.set("question", topic.canonicalQuestion);
  return `/w/${workspaceId}/brain/approved?${params.toString()}`;
}

export async function triggerGapClusterRun(
  workspaceId: string,
): Promise<{ ok: boolean }> {
  if (!workspaceId) return { ok: false };
  try {
    await supabase.functions.invoke("bb-gap-cluster", { body: { workspaceId } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
