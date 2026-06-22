/**
 * Phase 5 — In-Call Knowledge Bin (pure resolver).
 *
 * Frontend-only, deterministic assembly of the runtime knowledge the agent
 * needs during a live call. Inputs come from existing data sources
 * (campaign, form schema, canonical guide, supplementary campaign guide,
 * approved Business Brain facts, dispositions, current session values).
 *
 * No schema changes. No mutations. No I/O.
 *
 * Source precedence (locked):
 *   1. live_session            — caller / session facts already in runtime
 *   2. campaign_instruction    — campaign-level instructions
 *      required_field          — unfilled required intake fields
 *   3. workspace_guide         — canonical workspace guide (singleton)
 *   4. business_brain          — approved BB facts (verificationState=approved)
 *   5. supplementary           — supplementary guides / references
 *
 *   Dispositions / routing live in a separate `dispositions` sidecar group.
 *   They are operational, not factual, and never enter the precedence ladder.
 */

import type { FormSchemaV1, FormField } from "@/types/form-schema";
import type {
  WorkspaceGuideContentV2,
  WorkspaceGuideSection,
} from "@/types/workspace-guide";
import type { ApprovedFactView } from "@/lib/business-brain/selectors";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type KnowledgeSourceType =
  | "live_session"
  | "campaign_instruction"
  | "required_field"
  | "workspace_guide"
  | "business_brain"
  | "supplementary"
  | "routing";

/** Lower number = higher precedence. Routing is intentionally separate (NaN). */
export const PRECEDENCE: Record<KnowledgeSourceType, number> = {
  live_session: 1,
  campaign_instruction: 2,
  required_field: 2,
  workspace_guide: 3,
  business_brain: 4,
  supplementary: 5,
  routing: Number.POSITIVE_INFINITY,
};

export type FreshnessTier = "live" | "fresh" | "recent" | "aging" | "unknown";

export interface KnowledgeBinItem {
  id: string;
  sourceType: KnowledgeSourceType;
  /** Stable id of the underlying record when present (fact id, section id, ...). */
  sourceId: string | null;
  /** Workspace / campaign / client scope label, surfaced via chips. */
  scope: string;
  label: string;
  body: string;
  /** "approved" | "needs_review" | "n/a" — surfaced for BB facts mainly. */
  approvalState: "approved" | "needs_review" | "n/a";
  freshness: FreshnessTier;
  precedence: number;
  /** topicKey is what we dedupe on across precedence tiers to detect conflicts. */
  topicKey: string;
}

export interface KnowledgeBinGroup {
  kind: KnowledgeSourceType;
  label: string;
  description: string;
  items: KnowledgeBinItem[];
}

export interface KnowledgeBinConflict {
  topicKey: string;
  winner: KnowledgeBinItem;
  loser: KnowledgeBinItem;
  /** Human-readable explainer used in "why this answer" affordances. */
  reason: string;
}

export interface KnowledgeBin {
  caller: KnowledgeBinGroup;
  instructions: KnowledgeBinGroup;
  required: KnowledgeBinGroup;
  guide: KnowledgeBinGroup;
  approved: KnowledgeBinGroup;
  references: KnowledgeBinGroup;
  dispositions: KnowledgeBinGroup;
  conflicts: KnowledgeBinConflict[];
  /** Convenience: every non-routing item, sorted by precedence then label. */
  ordered: KnowledgeBinItem[];
}

// ────────────────────────────────────────────────────────────────────────
// Input shapes (decoupled from data hooks)
// ────────────────────────────────────────────────────────────────────────

export interface KnowledgeBinSessionContext {
  ani: string | null;
  callerName: string | null;
  /** Values already captured this session, keyed by form field key. */
  capturedValues: Record<string, unknown>;
}

export interface KnowledgeBinCampaignContext {
  id: string;
  name: string;
  /** Human campaign instructions, if any. */
  instructions: string | null;
}

export interface KnowledgeBinInputs {
  workspaceId: string;
  workspaceName: string | null;
  campaign: KnowledgeBinCampaignContext | null;
  form: { id: string; name: string } | null;
  schema: FormSchemaV1 | null;
  canonicalGuide: WorkspaceGuideContentV2 | null;
  /** Supplementary campaign-bound guide (the existing /guides one). */
  supplementaryGuide: { id: string; name: string; sections: WorkspaceGuideSection[] } | null;
  approvedFacts: ApprovedFactView[];
  dispositions: Array<{ id: string; name: string }>;
  session: KnowledgeBinSessionContext;
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function freshnessFromISO(iso: string | null): FreshnessTier {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "unknown";
  const ageDays = (Date.now() - t) / 86_400_000;
  if (ageDays < 1) return "fresh";
  if (ageDays < 14) return "recent";
  if (ageDays < 90) return "aging";
  return "unknown";
}

function bodyFromFact(f: ApprovedFactView): string {
  // Per-entity-type payloads are opaque; pull the most "readable" common keys.
  const p = f.payload as Record<string, unknown>;
  const fields = [
    p.answer,
    p.body,
    p.description,
    p.notes,
    p.text,
    p.value,
    f.firstSnippet,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return fields[0] ?? f.displayName;
}

// ────────────────────────────────────────────────────────────────────────
// Group builders
// ────────────────────────────────────────────────────────────────────────

function buildCaller(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  const items: KnowledgeBinItem[] = [];
  const { ani, callerName, capturedValues } = input.session;
  if (ani) {
    items.push({
      id: "caller:ani",
      sourceType: "live_session",
      sourceId: null,
      scope: "Live call",
      label: "Caller ANI",
      body: ani,
      approvalState: "n/a",
      freshness: "live",
      precedence: PRECEDENCE.live_session,
      topicKey: "caller_ani",
    });
  }
  if (callerName) {
    items.push({
      id: "caller:name",
      sourceType: "live_session",
      sourceId: null,
      scope: "Live call",
      label: "Caller name",
      body: callerName,
      approvalState: "n/a",
      freshness: "live",
      precedence: PRECEDENCE.live_session,
      topicKey: "caller_name",
    });
  }
  // Surface a few salient captured fields (skip system + empty).
  for (const [k, v] of Object.entries(capturedValues)) {
    if (k.startsWith("__") || v == null || v === "") continue;
    items.push({
      id: `caller:value:${k}`,
      sourceType: "live_session",
      sourceId: null,
      scope: "Captured this call",
      label: k.replace(/_/g, " "),
      body: String(v),
      approvalState: "n/a",
      freshness: "live",
      precedence: PRECEDENCE.live_session,
      topicKey: `value_${norm(k)}`,
    });
  }
  return items;
}

function buildInstructions(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  const items: KnowledgeBinItem[] = [];
  if (input.campaign?.instructions) {
    items.push({
      id: `instructions:${input.campaign.id}`,
      sourceType: "campaign_instruction",
      sourceId: input.campaign.id,
      scope: `Campaign · ${input.campaign.name}`,
      label: "Campaign instructions",
      body: input.campaign.instructions,
      approvalState: "n/a",
      freshness: "recent",
      precedence: PRECEDENCE.campaign_instruction,
      topicKey: "campaign_instructions",
    });
  }
  return items;
}

function buildRequired(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  if (!input.schema) return [];
  const captured = input.session.capturedValues;
  const out: KnowledgeBinItem[] = [];
  for (const section of input.schema.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const val = captured[field.key];
      const isFilled = val != null && val !== "";
      if (isFilled) continue;
      out.push({
        id: `required:${field.key}`,
        sourceType: "required_field",
        sourceId: field.id,
        scope: input.form ? `Form · ${input.form.name}` : "Intake form",
        label: field.label || field.key,
        body: field.helpText || `Ask the caller for ${field.label || field.key}.`,
        approvalState: "n/a",
        freshness: "live",
        precedence: PRECEDENCE.required_field,
        topicKey: `field_${norm(field.key)}`,
      });
    }
  }
  return out;
}

function buildGuide(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  const guide = input.canonicalGuide;
  if (!guide) return [];
  const out: KnowledgeBinItem[] = [];
  for (const section of guide.sections) {
    if (!section.enabled || section.visibility !== "agent") continue;
    const body = section.fields
      .map((f) => (f.value ? `${f.label}: ${f.value}` : ""))
      .filter(Boolean)
      .join("\n");
    if (!body) continue;
    out.push({
      id: `guide:${section.id}`,
      sourceType: "workspace_guide",
      sourceId: section.id,
      scope: "Canonical workspace guide",
      label: section.label,
      body,
      approvalState: "n/a",
      freshness: "recent",
      precedence: PRECEDENCE.workspace_guide,
      topicKey: `guide_${section.kind}`,
    });
  }
  return out;
}

function buildApproved(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  return input.approvedFacts
    .filter((f) => f.verificationState === "approved")
    .map<KnowledgeBinItem>((f) => ({
      id: `bb:${f.id}`,
      sourceType: "business_brain",
      sourceId: f.id,
      scope:
        f.clientId
          ? "Approved · client-scoped"
          : "Approved · workspace-scoped",
      label: f.displayName,
      body: bodyFromFact(f),
      approvalState: "approved",
      freshness: freshnessFromISO(f.lastReviewedAt),
      precedence: PRECEDENCE.business_brain,
      topicKey: `bb_${norm(f.entityType)}_${norm(f.displayName)}`,
    }));
}

function buildReferences(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  const sup = input.supplementaryGuide;
  if (!sup) return [];
  const out: KnowledgeBinItem[] = [];
  for (const section of sup.sections) {
    if (!section.enabled || section.visibility !== "agent") continue;
    const body = section.fields
      .map((f) => (f.value ? `${f.label}: ${f.value}` : ""))
      .filter(Boolean)
      .join("\n");
    if (!body) continue;
    out.push({
      id: `ref:${sup.id}:${section.id}`,
      sourceType: "supplementary",
      sourceId: section.id,
      scope: `Supplementary · ${sup.name}`,
      label: section.label,
      body,
      approvalState: "n/a",
      freshness: "aging",
      precedence: PRECEDENCE.supplementary,
      topicKey: `ref_${section.kind}`,
    });
  }
  return out;
}

function buildDispositions(input: KnowledgeBinInputs): KnowledgeBinItem[] {
  return input.dispositions.map((d) => ({
    id: `disp:${d.id}`,
    sourceType: "routing",
    sourceId: d.id,
    scope: "Routing",
    label: d.name,
    body: `Available wrap-up disposition: ${d.name}.`,
    approvalState: "n/a",
    freshness: "recent",
    precedence: PRECEDENCE.routing,
    topicKey: `disp_${norm(d.name)}`,
  }));
}

// ────────────────────────────────────────────────────────────────────────
// Conflict detection
// ────────────────────────────────────────────────────────────────────────

function detectConflicts(items: KnowledgeBinItem[]): {
  kept: KnowledgeBinItem[];
  conflicts: KnowledgeBinConflict[];
} {
  // Group by topicKey. If multiple precedence tiers contribute, the lowest
  // precedence number wins; the others are flagged but not dropped from
  // their group (UI may still want to render them with a "superseded" hint).
  const byTopic = new Map<string, KnowledgeBinItem[]>();
  for (const it of items) {
    if (!Number.isFinite(it.precedence)) continue; // skip routing sidecar
    const arr = byTopic.get(it.topicKey);
    if (arr) arr.push(it);
    else byTopic.set(it.topicKey, [it]);
  }
  const conflicts: KnowledgeBinConflict[] = [];
  for (const [topic, arr] of byTopic.entries()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.precedence - b.precedence);
    const winner = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const loser = arr[i];
      if (loser.precedence === winner.precedence) continue;
      conflicts.push({
        topicKey: topic,
        winner,
        loser,
        reason: `Higher precedence source (${winner.sourceType}, prec ${winner.precedence}) supersedes ${loser.sourceType} (prec ${loser.precedence}).`,
      });
    }
  }
  return { kept: items, conflicts };
}

// ────────────────────────────────────────────────────────────────────────
// Public entry
// ────────────────────────────────────────────────────────────────────────

export function buildKnowledgeBin(input: KnowledgeBinInputs): KnowledgeBin {
  const caller = buildCaller(input);
  const instructions = buildInstructions(input);
  const required = buildRequired(input);
  const guide = buildGuide(input);
  const approved = buildApproved(input);
  const references = buildReferences(input);
  const dispositions = buildDispositions(input);

  const factual = [...caller, ...instructions, ...required, ...guide, ...approved, ...references];
  const { conflicts } = detectConflicts(factual);

  const ordered = [...factual].sort((a, b) => {
    if (a.precedence !== b.precedence) return a.precedence - b.precedence;
    return a.label.localeCompare(b.label);
  });

  return {
    caller: {
      kind: "live_session",
      label: "Caller & live context",
      description: "Facts known about the active call.",
      items: caller,
    },
    instructions: {
      kind: "campaign_instruction",
      label: "Campaign instructions",
      description: "What this campaign asks the agent to do.",
      items: instructions,
    },
    required: {
      kind: "required_field",
      label: "Required to capture",
      description: "Mandatory intake fields still unfilled.",
      items: required,
    },
    guide: {
      kind: "workspace_guide",
      label: "Canonical workspace guide",
      description: "Single source of truth for this workspace.",
      items: guide,
    },
    approved: {
      kind: "business_brain",
      label: "Approved knowledge",
      description: "Reviewed and approved Business Brain facts.",
      items: approved,
    },
    references: {
      kind: "supplementary",
      label: "Supplementary references",
      description: "Lower-precedence reference material.",
      items: references,
    },
    dispositions: {
      kind: "routing",
      label: "Dispositions & routing",
      description: "Operational outcomes — sidecar, not part of the factual ladder.",
      items: dispositions,
    },
    conflicts,
    ordered,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Lookup helpers used by the assist layer
// ────────────────────────────────────────────────────────────────────────

/** Returns the highest-precedence item matching any of the given topic keys. */
export function pickByTopic(
  bin: KnowledgeBin,
  topicKeys: string[],
): KnowledgeBinItem | null {
  const set = new Set(topicKeys);
  for (const it of bin.ordered) {
    if (set.has(it.topicKey)) return it;
  }
  return null;
}

/** Best-effort: returns the first guide-or-better item whose label/body contains the needle. */
export function searchBin(bin: KnowledgeBin, needle: string): KnowledgeBinItem | null {
  const n = needle.toLowerCase().trim();
  if (!n) return null;
  for (const it of bin.ordered) {
    if (
      it.label.toLowerCase().includes(n) ||
      it.body.toLowerCase().includes(n)
    ) {
      return it;
    }
  }
  return null;
}

/** Total count of factual items (excludes routing sidecar). */
export function countFactual(bin: KnowledgeBin): number {
  return bin.ordered.length;
}

export type { FormField };
