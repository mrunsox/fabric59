/**
 * Phase 5 · Slice 1 — ASC-prefilled draft must satisfy the canonical
 * builder's Section 1 validation. The translator's deterministic name
 * fallback is the load-bearing piece here: without it, every ASC-origin
 * draft would fail save until the user manually filled name + client.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import type { CampaignIntakeData } from "@/types/campaign";

const FORKED_AT = "2026-06-17T00:00:00.000Z";

// Mirrors the validation rule in CampaignIntakePage.handleSave().
function canSave(intake: Partial<CampaignIntakeData>) {
  return !!(intake.campaignName && intake.clientName);
}

describe("ASC → canonical publish continuity (Phase 5 · Slice 1)", () => {
  it("an ASC draft with a non-empty business description passes Section 1 validation", () => {
    let d = createEmptyAscDraft({
      id: "asc-1", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Acme Plumbing for residential customers" },
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    expect(canSave(prefill)).toBe(true);
  });

  it("an ASC draft with no description still leaves required fields editable (not silently coerced)", () => {
    const d = createEmptyAscDraft({
      id: "asc-2", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    // Translator does NOT invent name/client out of nothing. Save is blocked
    // and the user fills in canonical fields — but ascOrigin is still
    // recorded so the panel renders.
    expect(canSave(prefill)).toBe(false);
    expect(prefill.ascOrigin?.ascDraftId).toBe("asc-2");
  });

  it("does not pre-populate publish-affecting fields (decisionTree, dispositions, ANI/DNIS)", () => {
    let d = createEmptyAscDraft({
      id: "asc-3", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "X Co" },
    });
    d = ascReducer(d, {
      type: "ADD_CALLER_REASON",
      reason: { id: "r1", label: "A", requiredCapture: [] },
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    expect(prefill.decisionTree).toBeUndefined();
    expect(prefill.newDispositions).toBeUndefined();
    expect(prefill.existingDispositions).toBeUndefined();
    expect(prefill.aniNumbers).toBeUndefined();
    expect(prefill.dnisNumbers).toBeUndefined();
  });
});
