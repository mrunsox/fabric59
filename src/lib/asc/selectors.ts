/**
 * ASC Slice 1 — selectors over AscDraft.
 * Pure functions; no memoization library dependency.
 *
 * Slice 4 adds advisory gap-item selectors. Gap items NEVER affect
 * `selectCanContinue` — they are advisory only.
 *
 * Slice 5 adds Logic Architect proposal/advisory selectors. LA proposals
 * also never block Continue — they are proposal-only.
 */
import {
  ASC_TOTAL_STEPS,
  type AscDraft,
  type AscGapItem,
  type AscGenerationMeta,
  type AscGenerationStatus,
  type AscLogicArchitectProposal,
  type AscStepStatus,
} from "./types";
import type { AscLaAdvisory, AscLaStep } from "./logicArchitectSchema";
import { computeInputFingerprint } from "./step8CompileSchema";

export function selectStepStatus(
  draft: AscDraft,
  step: number,
): AscStepStatus {
  return draft.stepStatus[step] ?? "idle";
}

export function selectIsResumable(draft: AscDraft | null | undefined): boolean {
  if (!draft) return false;
  return draft.state === "in_progress";
}

export function selectIsForked(draft: AscDraft | null | undefined): boolean {
  return !!draft && draft.state === "forked";
}

// Slice 8 — readiness + fork-eligibility selectors.
export {
  computeReadiness as selectReadinessReport,
} from "./readiness";
export type {
  AscReadinessIssue,
  AscReadinessReport,
  AscReadinessCategory,
  AscReadinessSeverity,
} from "./readiness";

import { computeReadiness as _computeReadinessForCanFork } from "./readiness";

export function selectCanFork(draft: AscDraft): boolean {
  if (selectIsForked(draft)) return false;
  return _computeReadinessForCanFork(draft).isSafeToFork;
}

/**
 * Slice 1/3/4 gating rules. Intentionally permissive. Gap-finder items and
 * Logic-Architect proposals are advisory/proposal-only — they never affect
 * Continue.
 */
export function selectCanContinue(draft: AscDraft, step: number): boolean {
  if (step < 1 || step > ASC_TOTAL_STEPS) return false;
  switch (step) {
    case 1:
      return draft.input.business.description.trim().length > 0;
    case 2:
      return draft.input.purpose.primaryOutcome.trim().length > 0;
    case 3:
      return draft.input.callerReasons.length > 0;
    case 4:
      return draft.input.callerReasons.length > 0;
    default:
      return true;
  }
}

export function selectAllStepStatuses(
  draft: AscDraft,
): Array<{ step: number; status: AscStepStatus }> {
  const out: Array<{ step: number; status: AscStepStatus }> = [];
  for (let s = 1; s <= ASC_TOTAL_STEPS; s++) {
    out.push({ step: s, status: selectStepStatus(draft, s) });
  }
  return out;
}

/** Slice 4 — visible (non-dismissed) advisory gap items for a step. */
export function selectGapItemsForStep(
  draft: AscDraft,
  step: 3 | 4,
): AscGapItem[] {
  const items = draft.meta.gapFinder?.itemsByStep?.[step] ?? [];
  return items.filter((g) => !g.dismissed);
}

/** Slice 5 — Logic Architect proposals (any status) for a step. */
export function selectLogicArchitectProposals(
  draft: AscDraft,
  step: AscLaStep,
): AscLogicArchitectProposal[] {
  return draft.meta.logicArchitect?.proposalsByStep?.[step] ?? [];
}

export function selectLogicArchitectAdvisories(
  draft: AscDraft,
  step: AscLaStep,
): AscLaAdvisory[] {
  return draft.meta.logicArchitect?.advisoriesByStep?.[step] ?? [];
}

// ── Slice 6 — Step 8 generation selectors ───────────────────────────────
export function selectGenerationMeta(draft: AscDraft): AscGenerationMeta {
  return (
    draft.meta.generation ?? {
      status: "idle",
      stale: true,
      staleReason: "never_generated",
    }
  );
}

export function selectGenerationStatus(draft: AscDraft): AscGenerationStatus {
  return selectGenerationMeta(draft).status;
}

/** True when there's no generated draft yet OR upstream inputs have changed. */
export function selectGenerationIsStale(draft: AscDraft): boolean {
  if (!draft.generated) return true;
  const meta = draft.meta.generation;
  if (!meta) return true;
  if (meta.stale) return true;
  // Defensive recompute: a freshly-rehydrated draft may have stale meta.
  return draft.generated.inputFingerprint !== computeInputFingerprint(draft.input);
}

export interface AscGenerationSummary {
  nodeCount: number;
  edgeCount: number;
  branchCount: number;
  outcomeCount: number;
  notificationCount: number;
  todoCount: number;
  lowConfidenceAreas: string[];
}

export function selectGeneratedSummary(
  draft: AscDraft,
): AscGenerationSummary | null {
  const g = draft.generated;
  if (!g) return null;
  const lowConfidenceAreas = Object.entries(g.confidenceByArea)
    .filter(([, v]) => v?.level === "low")
    .map(([k]) => k);
  return {
    nodeCount: g.flow.nodes.length,
    edgeCount: g.flow.edges.length,
    branchCount: Object.keys(g.reasonToBranch).length,
    outcomeCount: g.outcomes.length,
    notificationCount: g.notifications.length,
    todoCount: g.todos.length,
    lowConfidenceAreas,
  };
}

/** Slice 6 — Step 8 generate CTA gating. Mirrors Step 5/6/7 pre-reqs. */
export function selectCanGenerateStep8(draft: AscDraft): {
  ok: boolean;
  reason?: string;
} {
  const input = draft.input;
  if ((input.callerReasons ?? []).length === 0) {
    return { ok: false, reason: "Add at least one caller reason in Step 3." };
  }
  if ((input.outcomesDraftEdits ?? []).length === 0) {
    return { ok: false, reason: "Add at least one outcome in Step 5." };
  }
  if (!input.destination?.kind) {
    return { ok: false, reason: "Choose a destination kind in Step 7." };
  }
  return { ok: true };
}

// ── Slice 7 — Step 9 review selectors (pure, null-safe) ─────────────────
import type {
  AscGenerated,
  AscGeneratedFlowNode,
  AscGeneratedNotification,
} from "./types";

export interface AscReviewFlowOutlineEntry {
  reasonId: string;
  reasonLabel: string;
  handlingLabels: string[];
  outcomeLabels: string[];
}

/** Linearized outline: for each caller reason, walk the flow from its branch
 *  node, collecting handling labels and reachable outcome labels. Tolerates
 *  partial/malformed generated subtrees by skipping unresolved refs. */
export function selectFlowOutline(
  draft: AscDraft,
): AscReviewFlowOutlineEntry[] {
  const reasons = draft.input.callerReasons ?? [];
  const g = draft.generated;
  if (!g || !g.flow) {
    return reasons.map((r) => ({
      reasonId: r.id,
      reasonLabel: r.label,
      handlingLabels: [],
      outcomeLabels: [],
    }));
  }
  const nodes = g.flow.nodes ?? [];
  const edges = g.flow.edges ?? [];
  const nodeById = new Map<string, AscGeneratedFlowNode>();
  for (const n of nodes) if (n && n.id) nodeById.set(n.id, n);
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    if (!e || !e.from || !e.to) continue;
    const arr = outgoing.get(e.from) ?? [];
    arr.push(e.to);
    outgoing.set(e.from, arr);
  }
  const reasonToBranch = g.reasonToBranch ?? {};

  return reasons.map((r) => {
    const startId = reasonToBranch[r.id];
    const handlingLabels: string[] = [];
    const outcomeLabels: string[] = [];
    if (!startId || !nodeById.has(startId)) {
      return {
        reasonId: r.id,
        reasonLabel: r.label,
        handlingLabels,
        outcomeLabels,
      };
    }
    const visited = new Set<string>();
    const queue: string[] = [startId];
    const cap = Math.max(1, nodes.length);
    while (queue.length && visited.size <= cap) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const node = nodeById.get(cur);
      if (!node) continue;
      if (node.kind === "handling" && node.label) {
        handlingLabels.push(node.label);
      } else if (node.kind === "outcome") {
        const label = node.outcomeRef || node.label;
        if (label) outcomeLabels.push(label);
      }
      for (const next of outgoing.get(cur) ?? []) queue.push(next);
    }
    return {
      reasonId: r.id,
      reasonLabel: r.label,
      handlingLabels: dedupeStrings(handlingLabels),
      outcomeLabels: dedupeStrings(outcomeLabels),
    };
  });
}

export interface AscReviewOutcomeRow {
  outcomeRef: string;
  fromReasonLabels: string[];
  notificationCount: number;
}

export function selectOutcomesOverview(
  draft: AscDraft,
): AscReviewOutcomeRow[] {
  const g = draft.generated;
  if (!g) return [];
  const reasonLabelById = new Map<string, string>();
  for (const r of draft.input.callerReasons ?? []) {
    reasonLabelById.set(r.id, r.label);
  }
  return (g.outcomes ?? [])
    .filter((o): o is NonNullable<typeof o> => !!o && !!o.outcomeRef)
    .map((o) => ({
      outcomeRef: o.outcomeRef,
      fromReasonLabels: (o.fromReasonIds ?? [])
        .map((id) => reasonLabelById.get(id))
        .filter((v): v is string => typeof v === "string" && v.length > 0),
      notificationCount: (o.notificationRefs ?? []).length,
    }));
}

export function selectNotificationsByOutcome(
  draft: AscDraft,
): Record<string, AscGeneratedNotification[]> {
  const g = draft.generated;
  const out: Record<string, AscGeneratedNotification[]> = {};
  if (!g) return out;
  for (const n of g.notifications ?? []) {
    if (!n || !n.outcomeRef) continue;
    (out[n.outcomeRef] ??= []).push(n);
  }
  return out;
}

export interface AscReviewDestinationView {
  kind?: string;
  externalUrl?: string;
  deepLinkTemplate?: string;
  openMode?: string;
  notes?: string;
  slug?: string;
}

export function selectDestinationOverview(
  draft: AscDraft,
): AscReviewDestinationView {
  const dl = draft.generated?.destinationLaunch;
  const d = dl?.destination ?? draft.input.destination ?? undefined;
  const slug = dl?.launch?.slug ?? draft.input.launch?.slug;
  if (!d) return { slug };
  return {
    kind: d.kind,
    externalUrl: d.externalUrl,
    deepLinkTemplate: d.deepLinkTemplate,
    openMode: d.openMode,
    notes: d.notes,
    slug,
  };
}

export interface AscReviewTodoRow {
  id: string;
  area: string;
  message: string;
  jumpToStep?: number;
  source: "todo" | "low_confidence";
}

const AREA_TO_STEP: Record<string, number> = {
  flow: 4,
  copy: 4,
  outcomes: 5,
  notifications: 6,
  destination: 7,
};

export function selectReviewTodos(draft: AscDraft): AscReviewTodoRow[] {
  const g = draft.generated;
  if (!g) return [];
  const rows: AscReviewTodoRow[] = [];
  for (const t of g.todos ?? []) {
    if (!t) continue;
    rows.push({
      id: t.id,
      area: t.area,
      message: t.message,
      jumpToStep: AREA_TO_STEP[t.area],
      source: "todo",
    });
  }
  for (const [area, conf] of Object.entries(g.confidenceByArea ?? {})) {
    if (conf?.level === "low") {
      rows.push({
        id: `low-${area}`,
        area,
        message: conf.reason ?? `Low confidence in ${area}.`,
        jumpToStep: AREA_TO_STEP[area],
        source: "low_confidence",
      });
    }
  }
  return rows;
}

function dedupeStrings(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

export interface AscReviewOverview {
  hasGenerated: boolean;
  generatedAt?: string;
  businessDescription: string;
  primaryOutcome: string;
  callerReasonCount: number;
  nodeCount: number;
  outcomeCount: number;
  notificationCount: number;
  todoCount: number;
}

export function selectReviewOverview(draft: AscDraft): AscReviewOverview {
  const g: AscGenerated | undefined = draft.generated;
  return {
    hasGenerated: !!g,
    generatedAt: g?.generatedAt,
    businessDescription: draft.input.business.description,
    primaryOutcome: draft.input.purpose.primaryOutcome,
    callerReasonCount: (draft.input.callerReasons ?? []).length,
    nodeCount: g?.flow?.nodes?.length ?? 0,
    outcomeCount: g?.outcomes?.length ?? 0,
    notificationCount: g?.notifications?.length ?? 0,
    todoCount: g?.todos?.length ?? 0,
  };
}
