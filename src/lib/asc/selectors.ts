/**
 * ASC Slice 1 — selectors over AscDraft.
 * Pure functions; no memoization library dependency.
 *
 * Slice 4 adds advisory gap-item selectors. Gap items NEVER affect
 * `selectCanContinue` — they are advisory only.
 */
import {
  ASC_TOTAL_STEPS,
  type AscDraft,
  type AscGapItem,
  type AscStepStatus,
} from "./types";

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
 * Slice 1/3/4 gating rules. Intentionally permissive. Gap-finder items are
 * advisory only and never affect Continue.
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
