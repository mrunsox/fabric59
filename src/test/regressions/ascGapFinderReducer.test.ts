/**
 * ASC Slice 4 — Gap-finder reducer (advisory-only).
 *
 * Covers:
 *   - APPLY_GAP_FINDER_RESULT replaces items per step and filters items
 *     referencing unknown reasonIds
 *   - DISMISS_GAP_ITEM soft-hides locally without touching draft input
 *   - REMOVE_CALLER_REASON drops gap items whose only reason is removed
 *   - Gap items never appear in draft.unresolved and never alter draft.input
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { selectGapItemsForStep } from "@/lib/asc/selectors";
import type { AscDraft, AscGapItem } from "@/lib/asc/types";

function seed(): AscDraft {
  const d = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-16T00:00:00.000Z",
  });
  return ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "cr-1", label: "Intake", requiredCapture: [] },
  });
}

const items: AscGapItem[] = [
  {
    id: "g-1",
    step: 3,
    kind: "missing_handling",
    message: "No handling for Intake.",
    reasonIds: ["cr-1"],
  },
  {
    id: "g-2",
    step: 3,
    kind: "duplicate_reasons",
    message: "Two reasons overlap.",
  },
  {
    id: "g-bad",
    step: 3,
    kind: "missing_handling",
    message: "Refers to a removed reason.",
    reasonIds: ["cr-ghost"],
  },
];

describe("ASC Slice 4 — Gap-finder reducer", () => {
  it("APPLY_GAP_FINDER_RESULT stores items and filters unknown reasonIds", () => {
    const draft = seed();
    const next = ascReducer(draft, {
      type: "APPLY_GAP_FINDER_RESULT",
      step: 3,
      items,
      now: "2026-06-16T00:01:00.000Z",
    });
    const stored = next.meta.gapFinder?.itemsByStep?.[3] ?? [];
    expect(stored.map((g) => g.id).sort()).toEqual(["g-1", "g-2"]);
    expect(next.meta.gapFinder?.lastRunAt).toBe("2026-06-16T00:01:00.000Z");
    // draft.input untouched, draft.unresolved untouched.
    expect(next.input.callerReasons).toHaveLength(1);
    expect(next.unresolved).toHaveLength(0);
  });

  it("DISMISS_GAP_ITEM hides locally without touching draft.input", () => {
    const draft = seed();
    const a = ascReducer(draft, {
      type: "APPLY_GAP_FINDER_RESULT",
      step: 3,
      items,
      now: "2026-06-16T00:01:00.000Z",
    });
    const b = ascReducer(a, {
      type: "DISMISS_GAP_ITEM",
      step: 3,
      itemId: "g-1",
    });
    expect(selectGapItemsForStep(b, 3).map((g) => g.id)).toEqual(["g-2"]);
    expect(b.input.callerReasons).toHaveLength(1);
  });

  it("REMOVE_CALLER_REASON drops gap items whose only reason is removed", () => {
    const draft = seed();
    const a = ascReducer(draft, {
      type: "APPLY_GAP_FINDER_RESULT",
      step: 3,
      items,
      now: "2026-06-16T00:01:00.000Z",
    });
    const b = ascReducer(a, { type: "REMOVE_CALLER_REASON", id: "cr-1" });
    const remaining = b.meta.gapFinder?.itemsByStep?.[3] ?? [];
    // g-1 referenced only cr-1 → dropped. g-2 has no reasonIds → kept.
    expect(remaining.map((g) => g.id)).toEqual(["g-2"]);
  });
});
