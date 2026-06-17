/**
 * ASC Slice 6 — Step 8 staleness guard.
 *
 * Per Slice 6 scope guard: when any Step 1–7 input changes after a successful
 * generation, the generated draft must:
 *   1. remain viewable (NOT deleted),
 *   2. be flagged stale (staleReason="input_changed"),
 *   3. require explicit regeneration before it's considered current.
 *
 * Also covers: APPLY with matching fingerprint clears stale; subsequent input
 * change re-stales without losing the draft.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import type { AscAction } from "@/lib/asc/actions";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function seedDraft(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  // Seed a non-trivial Step 1–7 state.
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Biz" } });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book consult" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "Booking", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "ADD_OUTCOME_EDIT",
    outcome: { id: "o1", label: "Booked" },
  });
  d = ascReducer(d, {
    type: "ADD_NOTIFICATION_EDIT",
    notification: { id: "n1", trigger: "Booked", channel: "slack" },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "internal_runner" },
  });
  d = ascReducer(d, { type: "SET_LAUNCH", launch: { slug: "test" } });
  return d;
}

function makeGenerated(draft: AscDraft): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:00:10.000Z",
    inputFingerprint: computeInputFingerprint(draft.input),
    flow: {
      nodes: [{ id: "entry", kind: "entry", label: "Start" }],
      edges: [],
    },
    reasonToBranch: {},
    outcomes: [],
    notifications: [],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [],
    confidenceByArea: {},
  };
}

function applyFreshGeneration(d: AscDraft): AscDraft {
  return ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated: makeGenerated(d),
    advisories: [],
    now: "2026-06-17T00:00:10.000Z",
  });
}

const INPUT_MUTATIONS: Array<{
  name: string;
  action: AscAction;
}> = [
  {
    name: "UPDATE_BUSINESS (Step 1 is upstream of compile)",
    action: { type: "UPDATE_BUSINESS", patch: { description: "Different biz" } },
  },
  {
    name: "UPDATE_PURPOSE (Step 2 primary outcome)",
    action: {
      type: "UPDATE_PURPOSE",
      patch: { primaryOutcome: "Different primary" },
    },
  },
  {
    name: "ADD_CALLER_REASON",
    action: {
      type: "ADD_CALLER_REASON",
      reason: { id: "r2", label: "Other", requiredCapture: [] },
    },
  },
  {
    name: "UPDATE_CALLER_REASON",
    action: { type: "UPDATE_CALLER_REASON", id: "r1", patch: { opener: "Hi" } },
  },
  {
    name: "REMOVE_CALLER_REASON",
    action: { type: "REMOVE_CALLER_REASON", id: "r1" },
  },
  {
    name: "ADD_OUTCOME_EDIT",
    action: {
      type: "ADD_OUTCOME_EDIT",
      outcome: { id: "o2", label: "Cancelled" },
    },
  },
  {
    name: "REMOVE_OUTCOME_EDIT",
    action: { type: "REMOVE_OUTCOME_EDIT", id: "o1" },
  },
  {
    name: "ADD_NOTIFICATION_EDIT",
    action: {
      type: "ADD_NOTIFICATION_EDIT",
      notification: { id: "n2", trigger: "Booked", channel: "email" },
    },
  },
  {
    name: "SET_DESTINATION",
    action: {
      type: "SET_DESTINATION",
      destination: { kind: "external_url", externalUrl: "https://x" },
    },
  },
  {
    name: "SET_LAUNCH",
    action: { type: "SET_LAUNCH", launch: { slug: "renamed" } },
  },
];

describe("ASC Step 8 staleness guard (Slice 6)", () => {
  let seeded: AscDraft;
  beforeEach(() => {
    seeded = applyFreshGeneration(seedDraft());
    expect(seeded.meta.generation?.status).toBe("success");
    expect(seeded.meta.generation?.stale).toBe(false);
    expect(seeded.generated).toBeDefined();
  });

  for (const { name, action } of INPUT_MUTATIONS) {
    it(`${name} stales generation but keeps generated viewable`, () => {
      const next = ascReducer(seeded, action);
      // 1) Draft persists
      expect(next.generated).toBeDefined();
      expect(next.generated).toEqual(seeded.generated);
      // 2) Marked stale with the right reason
      expect(next.meta.generation?.stale).toBe(true);
      expect(next.meta.generation?.staleReason).toBe("input_changed");
      // 3) Status still reflects last successful run (not reset to compiling/idle)
      expect(next.meta.generation?.status).toBe("success");
    });
  }

  it("regeneration with matching fingerprint clears stale flag", () => {
    const mutated = ascReducer(seeded, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Different biz" },
    });
    expect(mutated.meta.generation?.stale).toBe(true);
    expect(mutated.generated).toBeDefined();

    const regenerated = applyFreshGeneration(mutated);
    expect(regenerated.meta.generation?.stale).toBe(false);
    expect(regenerated.generated).toBeDefined();
    expect(regenerated.generated?.inputFingerprint).toBe(
      computeInputFingerprint(regenerated.input),
    );
  });

  it("draft remains viewable through stale → regenerate → re-stale cycle", () => {
    const a = ascReducer(seeded, {
      type: "UPDATE_BUSINESS",
      patch: { description: "v2" },
    });
    expect(a.generated).toBeDefined();
    const b = applyFreshGeneration(a);
    expect(b.meta.generation?.stale).toBe(false);
    const c = ascReducer(b, {
      type: "ADD_OUTCOME_EDIT",
      outcome: { id: "o3", label: "Voicemail" },
    });
    expect(c.generated).toBeDefined();
    expect(c.meta.generation?.stale).toBe(true);
  });

  it("non-input-mutating actions (SET_STEP, MARK_STEP_STATUS) do not stale", () => {
    const a = ascReducer(seeded, { type: "SET_STEP", step: 9 });
    expect(a.meta.generation?.stale).toBe(false);
    const b = ascReducer(seeded, {
      type: "MARK_STEP_STATUS",
      step: 8,
      status: "complete",
    });
    expect(b.meta.generation?.stale).toBe(false);
  });
});
