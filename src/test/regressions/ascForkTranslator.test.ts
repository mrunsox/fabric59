/**
 * ASC Slice 8 — fork translator (ASC → canonical intake prefill).
 *
 * Pure; no I/O. Conservative carry-over of todos as ASC follow-up notes,
 * no propagation of ASC-only metadata.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function seed(): AscDraft {
  let d = createEmptyAscDraft({
    id: "asc-fork-1", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, {
    type: "UPDATE_BUSINESS",
    patch: { description: "Mountain Law PLLC — boutique civil firm" },
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

describe("translateAscDraftToIntake (Slice 8)", () => {
  it("maps confirmed inputs into a Partial<CampaignIntakeData> prefill", () => {
    const d = seed();
    const result = translateAscDraftToIntake(d);
    expect(result.source).toBe("asc-wizard");
    expect(result.ascDraftId).toBe("asc-fork-1");
    expect(result.prefill.campaignDescription).toContain("Mountain Law");
    expect(result.prefill.additionalNotes).toBeTruthy();
    expect(result.prefill.additionalNotes).toContain("ASC draft follow-ups");
    expect(result.prefill.additionalNotes).toContain("Primary outcome (ASC): Book intake");
    expect(result.prefill.additionalNotes).toContain("Caller reasons (ASC, 2)");
    expect(result.prefill.additionalNotes).toContain("kind=external_url");
    expect(result.prefill.additionalNotes).toContain("Launch slug (ASC): mountain-intake");
  });

  it("omits optional fields rather than nulling them", () => {
    let d = createEmptyAscDraft({
      id: "asc-fork-2", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    // Minimal: one caller reason, no description, no destination.
    d = ascReducer(d, {
      type: "ADD_CALLER_REASON",
      reason: { id: "r1", label: "X", requiredCapture: [] },
    });
    const result = translateAscDraftToIntake(d);
    expect(result.prefill.campaignDescription).toBeUndefined();
    // additionalNotes present (caller reason carry-over), but no destination block.
    expect(result.prefill.additionalNotes ?? "").not.toContain("Destination (ASC)");
  });

  it("carries todos into notes under a clear ASC header, capped + truncated", () => {
    let d = seed();
    const longMsg = "x".repeat(500);
    const todos = Array.from({ length: 25 }, (_, i) => ({
      id: `t${i}`,
      area: "copy" as const,
      message: i === 0 ? longMsg : `todo ${i}`,
    }));
    d = withGenerated(d, { todos });
    const result = translateAscDraftToIntake(d);
    const notes = result.prefill.additionalNotes ?? "";
    expect(notes).toContain("ASC draft follow-ups");
    // First todo truncated with ellipsis.
    expect(notes).toContain("…");
    // Cap at 20 → message about omitted overflow present.
    expect(notes).toContain("5 more follow-ups omitted");
  });

  it("does NOT propagate ASC-only metadata (interviewer/gapFinder/logicArchitect)", () => {
    let d = seed();
    d = withGenerated(d, {
      todos: [{ id: "t1", area: "copy", message: "Write opener" }],
    });
    // Add some interviewer/gap-finder/LA-shaped junk into meta to be safe.
    d = {
      ...d,
      meta: {
        ...d.meta,
        interviewer: { lastTurnByStep: {}, confirmedFields: ["business.description"] },
        gapFinder: { itemsByStep: { 3: [{ id: "g1", message: "GAP", severity: "info" } as never] } },
        logicArchitect: { lastRunAt: {}, proposalsByStep: {}, advisoriesByStep: {} },
      },
    };
    const json = JSON.stringify(translateAscDraftToIntake(d));
    expect(json).not.toContain("interviewer");
    expect(json).not.toContain("gapFinder");
    expect(json).not.toContain("logicArchitect");
    expect(json).not.toContain("confirmedFields");
  });

  it("is pure: same input → same output", () => {
    const d = seed();
    const a = translateAscDraftToIntake(d);
    const b = translateAscDraftToIntake(d);
    expect(a).toEqual(b);
  });
});
