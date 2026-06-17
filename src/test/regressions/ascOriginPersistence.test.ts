/**
 * Phase 5 · Slice 1 — ascOrigin must survive a JSONB round-trip and a
 * canonical-builder edit cycle. Simulates the persistence path used by
 * useSaveCampaignSetup (JSON.parse(JSON.stringify(intakeData))) and the
 * subsequent merge with the form's empty-intake defaults on reload.
 */
import { describe, it, expect } from "vitest";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { CampaignIntakeData } from "@/types/campaign";

const FORKED_AT = "2026-06-17T00:00:00.000Z";

// Mirrors `emptyIntake` in CampaignIntakePage. Kept minimal — only the
// fields needed to prove the merge doesn't strip ascOrigin.
const emptyIntake: Partial<CampaignIntakeData> = {
  campaignName: "",
  clientName: "",
  newDispositions: [],
  existingDispositions: [],
  aniNumbers: [""],
  dnisNumbers: [""],
  whiteLabel: false,
  coverageType: "24/7",
  enableDispositionEmail: false,
  backendDocConnector: false,
  decisionTree: [],
  skillName: "",
  assignedUsers: [],
  addSkillToIvr: false,
  priority: "normal",
};

function seedDraftWithEverything() {
  let d = createEmptyAscDraft({
    id: "asc-1", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, {
    type: "UPDATE_BUSINESS",
    patch: { description: "Acme Plumbing for the Pacific Northwest residential market" },
  });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book service call" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "New service request", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "internal_runner" },
  });
  return d;
}

describe("ascOrigin persistence (Phase 5 · Slice 1)", () => {
  it("survives the empty-intake merge applied at first mount", () => {
    const draft = seedDraftWithEverything();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    const merged = { ...emptyIntake, ...prefill } as CampaignIntakeData;
    expect(merged.ascOrigin).toBeDefined();
    expect(merged.ascOrigin?.ascDraftId).toBe("asc-1");
    expect(merged.ascOrigin?.forkedAt).toBe(FORKED_AT);
    expect(merged.ascOrigin?.carried?.primaryOutcome).toBe("Book service call");
  });

  it("round-trips through the JSONB save path without loss", () => {
    const draft = seedDraftWithEverything();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    const merged = { ...emptyIntake, ...prefill } as CampaignIntakeData;

    // Mirrors useSaveCampaignSetup's `JSON.parse(JSON.stringify(intakeData))`.
    const persisted = JSON.parse(JSON.stringify(merged));

    // And the reload-merge that CampaignIntakePage does when `existing` arrives.
    const reloaded = { ...emptyIntake, ...persisted } as CampaignIntakeData;
    expect(reloaded.ascOrigin).toEqual(merged.ascOrigin);
  });

  it("update() patches that touch other fields do not strip ascOrigin", () => {
    const draft = seedDraftWithEverything();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    let intake = { ...emptyIntake, ...prefill } as CampaignIntakeData;
    // Simulate the `update(patch)` shape used by CampaignIntakePage.
    const update = (patch: Partial<CampaignIntakeData>) => {
      intake = { ...intake, ...patch };
    };
    update({ campaignName: "User edit" });
    update({ newDispositions: ["X"] });
    update({ additionalNotes: "user note" });
    expect(intake.ascOrigin).toBeDefined();
    expect(intake.ascOrigin?.ascDraftId).toBe("asc-1");
  });

  it("reviewState dismissals persist via update() without mutating carried", () => {
    const draft = seedDraftWithEverything();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    let intake = { ...emptyIntake, ...prefill } as CampaignIntakeData;
    const originalCarried = JSON.stringify(intake.ascOrigin!.carried);
    intake = {
      ...intake,
      ascOrigin: {
        ...intake.ascOrigin!,
        reviewState: { followUpsDismissedIds: ["t1", "t2"] },
      },
    };
    expect(intake.ascOrigin?.reviewState?.followUpsDismissedIds).toEqual(["t1", "t2"]);
    expect(JSON.stringify(intake.ascOrigin!.carried)).toBe(originalCarried);
  });
});
