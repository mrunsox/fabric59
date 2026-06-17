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
