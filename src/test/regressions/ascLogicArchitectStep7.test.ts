/**
 * ASC Slice 5 — Step 7 destination + slug behavior.
 *
 * Covers:
 *   - Slug candidate confirm requires chosenSlug + slugIsUnique=true
 *   - Manual SET_LAUNCH stales pending slug-candidate proposal
 *   - Manual SET_DESTINATION stales matching destination subfield proposal
 *   - Slug uniqueness is decided client-side; AI proposal alone never writes
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { snapshotForLaProposal } from "@/lib/asc/logicArchitectSchema";
import type { AscDraft, AscLogicArchitectProposal } from "@/lib/asc/types";

function slugProposal(draft: AscDraft): AscLogicArchitectProposal {
  return {
    id: "la-slug",
    step: 7,
    targetField: "launch.slugCandidates",
    value: ["intake", "client-intake"],
    confidence: "medium",
    rationale: "Short and relevant.",
    status: "pending",
    fieldSnapshot: snapshotForLaProposal(draft.input, "launch.slugCandidates"),
    issuedAt: "2026-06-17T00:00:00.000Z",
  };
}

function destKindProposal(draft: AscDraft): AscLogicArchitectProposal {
  return {
    id: "la-kind",
    step: 7,
    targetField: "destination.kind",
    value: "internal_runner",
    confidence: "high",
    rationale: "Default.",
    status: "pending",
    fieldSnapshot: snapshotForLaProposal(draft.input, "destination.kind"),
    issuedAt: "2026-06-17T00:00:00.000Z",
  };
}

describe("ASC Logic Architect Step 7 (Slice 5)", () => {
  const baseDraft = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });

  it("Confirm without chosenSlug or unique=true never writes", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [slugProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 7,
      proposalId: "la-slug",
    });
    expect(b.input.launch?.slug).toBeUndefined();
    // Still pending so the user can pick again.
    expect(b.meta.logicArchitect?.proposalsByStep[7]?.[0].status).toBe("pending");
  });

  it("Confirm with chosen unique slug writes through and marks confirmed", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [slugProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 7,
      proposalId: "la-slug",
      chosenSlug: "intake",
      slugIsUnique: true,
    });
    expect(b.input.launch?.slug).toBe("intake");
    expect(b.meta.logicArchitect?.proposalsByStep[7]?.[0].status).toBe(
      "confirmed",
    );
  });

  it("Confirm with slugIsUnique=false is a no-op write", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [slugProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 7,
      proposalId: "la-slug",
      chosenSlug: "intake",
      slugIsUnique: false,
    });
    expect(b.input.launch?.slug).toBeUndefined();
  });

  it("Confirm rejects a chosen slug not present in candidates", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [slugProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 7,
      proposalId: "la-slug",
      chosenSlug: "made-up",
      slugIsUnique: true,
    });
    expect(b.input.launch?.slug).toBeUndefined();
  });

  it("Manual SET_LAUNCH stales pending slug-candidate proposal", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [slugProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "SET_LAUNCH",
      launch: { slug: "manual-pick", editableUntilPublish: true },
    });
    expect(b.meta.logicArchitect?.proposalsByStep[7]?.[0].status).toBe("stale");
  });

  it("Manual SET_DESTINATION stales matching destination.kind proposal", () => {
    const a = ascReducer(baseDraft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 7,
      proposals: [destKindProposal(baseDraft)],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "SET_DESTINATION",
      destination: { kind: "external_url", externalUrl: "https://x" },
    });
    expect(b.meta.logicArchitect?.proposalsByStep[7]?.[0].status).toBe("stale");
  });
});
