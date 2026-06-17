/**
 * ASC → canonical intake translator — Phase 5 · Slice 1 contract.
 *
 * Verifies:
 *   - deterministic, modest name fallback unblocks Section 1 save
 *   - structured carry-over lives in `prefill.ascOrigin`, not in
 *     `additionalNotes`
 *   - ASC-only metadata never leaks into prefill
 *   - purity (same input + same options → same output)
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

const FORKED_AT = "2026-06-17T00:00:00.000Z";

function seed(): AscDraft {
  let d = createEmptyAscDraft({
    id: "asc-fork-1", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, {
    type: "UPDATE_BUSINESS",
    patch: { description: "Mountain Law PLLC boutique civil firm in Calgary handling new client intake" },
  });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book intake", secondaryOutcome: "Schedule callback" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "New matter", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r2", label: "Existing client", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "external_url", externalUrl: "https://example.com/intake", openMode: "new_tab" },
  });
  d = ascReducer(d, { type: "SET_LAUNCH", launch: { slug: "mountain-intake" } });
  return d;
}

function withGenerated(d: AscDraft, gen: Partial<AscGenerated>): AscDraft {
  const generated: AscGenerated = {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: "fp",
    flow: { nodes: [], edges: [] },
    reasonToBranch: {},
    outcomes: [],
    notifications: [],
    destinationLaunch: { destination: { kind: "external_url" }, launch: {} },
    todos: [],
    confidenceByArea: {},
    ...gen,
  };
  return { ...d, generated };
}

describe("translateAscDraftToIntake (Phase 5 · Slice 1)", () => {
  it("populates deterministic name fallback + description and ascOrigin carry-over", () => {
    const d = seed();
    const result = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });

    expect(result.source).toBe("asc-wizard");
    expect(result.ascDraftId).toBe("asc-fork-1");

    // Section 1 unblock: campaignName/clientName non-empty, modest (no quotes, no polish).
    expect(result.prefill.campaignName).toBeTruthy();
    expect(result.prefill.clientName).toBeTruthy();
    expect(result.prefill.campaignName!.length).toBeLessThanOrEqual(60);
    expect(result.prefill.campaignName).not.toMatch(/^["']/);
    expect(result.prefill.campaignDescription).toContain("Mountain Law");

    // Structured context lives in ascOrigin, NOT in additionalNotes.
    const origin = result.prefill.ascOrigin!;
    expect(origin.ascDraftId).toBe("asc-fork-1");
    expect(origin.forkedAt).toBe(FORKED_AT);
    expect(origin.carried?.primaryOutcome).toBe("Book intake");
    expect(origin.carried?.secondaryOutcome).toBe("Schedule callback");
    expect(origin.carried?.callerReasons).toEqual([
      { id: "r1", label: "New matter" },
      { id: "r2", label: "Existing client" },
    ]);
    expect(origin.carried?.destination?.kind).toBe("external_url");
    expect(origin.carried?.destination?.externalUrl).toBe("https://example.com/intake");
    expect(origin.carried?.launchSlug).toBe("mountain-intake");
    expect(origin.reviewState?.followUpsDismissedIds).toEqual([]);

    // additionalNotes is a short pointer, not a structured blob.
    expect(result.prefill.additionalNotes ?? "").toMatch(/ASC origin panel/);
    expect(result.prefill.additionalNotes ?? "").not.toMatch(/Caller reasons \(ASC/);
    expect(result.prefill.additionalNotes ?? "").not.toMatch(/Primary outcome \(ASC\)/);
  });

  it("records provenance even when there is no structured carry-over", () => {
    const d = createEmptyAscDraft({
      id: "asc-fork-2", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const result = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    expect(result.prefill.ascOrigin?.ascDraftId).toBe("asc-fork-2");
    expect(result.prefill.ascOrigin?.carried).toBeUndefined();
    expect(result.prefill.ascOrigin?.followUps).toBeUndefined();
    // No pointer note when there is nothing structured to point at.
    expect(result.prefill.additionalNotes).toBeUndefined();
    expect(result.prefill.campaignName).toBeUndefined();
  });

  it("carries generated todos into ascOrigin.followUps, capped at 20", () => {
    let d = seed();
    const todos = Array.from({ length: 25 }, (_, i) => ({
      id: `t${i}`,
      area: "copy" as const,
      message: i === 0 ? "x".repeat(500) : `todo ${i}`,
    }));
    d = withGenerated(d, { todos });
    const result = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    const followUps = result.prefill.ascOrigin!.followUps!;
    // 20 carried + 1 overflow summary row.
    expect(followUps).toHaveLength(21);
    expect(followUps[0].message.endsWith("…")).toBe(true);
    expect(followUps[20].id).toBe("__overflow__");
    expect(followUps[20].message).toMatch(/5 more follow-ups omitted/);
  });

  it("does NOT propagate ASC-only metadata (interviewer/gapFinder/logicArchitect)", () => {
    let d = seed();
    d = withGenerated(d, {
      todos: [{ id: "t1", area: "copy", message: "Write opener" }],
    });
    d = {
      ...d,
      meta: {
        ...d.meta,
        interviewer: { lastTurnByStep: {}, confirmedFields: ["business.description"] },
        gapFinder: { itemsByStep: { 3: [{ id: "g1", message: "GAP", severity: "info" } as never] } },
        logicArchitect: { lastRunAt: {}, proposalsByStep: {}, advisoriesByStep: {} },
      },
    };
    const json = JSON.stringify(translateAscDraftToIntake(d, { forkedAt: FORKED_AT }));
    expect(json).not.toContain("interviewer");
    expect(json).not.toContain("gapFinder");
    expect(json).not.toContain("logicArchitect");
    expect(json).not.toContain("confirmedFields");
  });

  it("is pure: same input + same forkedAt → same output", () => {
    const d = seed();
    const a = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    const b = translateAscDraftToIntake(d, { forkedAt: FORKED_AT });
    expect(a).toEqual(b);
  });
});
