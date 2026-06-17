/**
 * Phase 5 · Slice 1 — Translator audit assertions specific to assimilation
 * pressure on the canonical intake contract. (The base translator test
 * lives in ascForkTranslator.test.ts; this file pins down the canonical
 * intake side of the contract.)
 */
import { describe, it, expect } from "vitest";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { ascReducer } from "@/lib/asc/reducer";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import type { CampaignIntakeData } from "@/types/campaign";

const FORKED_AT = "2026-06-17T00:00:00.000Z";

describe("ASC → canonical intake assimilation contract", () => {
  it("emits only keys that exist on CampaignIntakeData (no shadow fields)", () => {
    let d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "An example business description for translator audit" },
    });
    d = ascReducer(d, {
      type: "ADD_CALLER_REASON",
      reason: { id: "r1", label: "Reason A", requiredCapture: [] },
    });
    d = ascReducer(d, {
      type: "SET_DESTINATION",
      destination: { kind: "internal_runner" },
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });

    const allowedKeys: Array<keyof CampaignIntakeData> = [
      "campaignName",
      "clientName",
      "campaignDescription",
      "additionalNotes",
      "ascOrigin",
    ];
    for (const k of Object.keys(prefill)) {
      expect(allowedKeys).toContain(k as keyof CampaignIntakeData);
    }
  });

  it("name fallback is deterministic and modest (no quotes, no marketing punctuation)", () => {
    let d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Acme Plumbing serves residential customers in the Pacific Northwest" },
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    expect(prefill.campaignName).toBe(prefill.clientName);
    expect(prefill.campaignName).not.toMatch(/[!?"'’“”—]/);
    // Snap-to-word-boundary, never mid-word for length > 60.
    expect(prefill.campaignName!.endsWith("-")).toBe(false);
    expect(prefill.campaignName!.length).toBeLessThanOrEqual(60);
  });

  it("does not invent canonical fields the translator was not told about", () => {
    let d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "x" },
    });
    const { prefill } = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    // ANI/DNIS, schedule, dispositions, decision tree must not be invented.
    expect(prefill.aniNumbers).toBeUndefined();
    expect(prefill.dnisNumbers).toBeUndefined();
    expect(prefill.coverageType).toBeUndefined();
    expect(prefill.existingDispositions).toBeUndefined();
    expect(prefill.newDispositions).toBeUndefined();
    expect(prefill.decisionTree).toBeUndefined();
    expect(prefill.skillName).toBeUndefined();
  });
});
