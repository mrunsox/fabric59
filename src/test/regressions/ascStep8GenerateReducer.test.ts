/**
 * ASC Slice 6 — Step 8 reducer lifecycle.
 *
 * Covers:
 *  - BEGIN → APPLY happy path: status flips to success, generated stored.
 *  - APPLY is atomic: prior generated replaced wholesale, no field bleed.
 *  - FAIL keeps prior generated intact + records error.
 *  - DISCARD clears generated + resets meta to idle.
 *  - APPLY with stale fingerprint records stale=true immediately.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function makeGenerated(
  draft: AscDraft,
  overrides: Partial<AscGenerated> = {},
): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:00:01.000Z",
    inputFingerprint: computeInputFingerprint(draft.input),
    flow: {
      nodes: [{ id: "entry", kind: "entry", label: "Start" }],
      edges: [],
    },
    reasonToBranch: {},
    outcomes: [],
    notifications: [],
    destinationLaunch: {
      destination: { kind: "internal_runner" },
      launch: {},
    },
    todos: [],
    confidenceByArea: {},
    ...overrides,
  };
}

describe("ASC Step 8 reducer (Slice 6)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
  });

  it("BEGIN sets compiling status", () => {
    const a = ascReducer(draft, {
      type: "BEGIN_STEP8_GENERATION",
      now: "2026-06-17T00:00:01.000Z",
    });
    expect(a.meta.generation?.status).toBe("compiling");
    expect(a.meta.generation?.lastError).toBeUndefined();
  });

  it("APPLY stores generated and flips status to success", () => {
    const begun = ascReducer(draft, {
      type: "BEGIN_STEP8_GENERATION",
      now: "2026-06-17T00:00:01.000Z",
    });
    const next = ascReducer(begun, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(begun),
      advisories: [],
      now: "2026-06-17T00:00:02.000Z",
    });
    expect(next.meta.generation?.status).toBe("success");
    expect(next.meta.generation?.stale).toBe(false);
    expect(next.meta.generation?.lastRunAt).toBe("2026-06-17T00:00:02.000Z");
    expect(next.generated?.flow.nodes).toHaveLength(1);
  });

  it("APPLY is atomic (replaces prior generated wholesale)", () => {
    const first = ascReducer(draft, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(draft, {
        flow: {
          nodes: [
            { id: "entry", kind: "entry", label: "v1-entry" },
            { id: "ext", kind: "outcome", label: "v1-only" },
          ],
          edges: [],
        },
      }),
      advisories: [],
      now: "2026-06-17T00:00:02.000Z",
    });
    const second = ascReducer(first, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(first, {
        flow: {
          nodes: [{ id: "entry", kind: "entry", label: "v2-entry" }],
          edges: [],
        },
      }),
      advisories: [],
      now: "2026-06-17T00:00:03.000Z",
    });
    // No leakage from v1
    expect(second.generated?.flow.nodes.map((n) => n.id)).toEqual(["entry"]);
    expect(second.generated?.flow.nodes[0].label).toBe("v2-entry");
  });

  it("FAIL keeps prior generated intact and records error", () => {
    const withGen = ascReducer(draft, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(draft),
      advisories: [],
      now: "2026-06-17T00:00:02.000Z",
    });
    const failed = ascReducer(withGen, {
      type: "FAIL_STEP8_GENERATION",
      now: "2026-06-17T00:00:03.000Z",
      error: { code: "schema_invalid", message: "bad" },
    });
    expect(failed.meta.generation?.status).toBe("error");
    expect(failed.meta.generation?.lastError?.code).toBe("schema_invalid");
    expect(failed.generated).toEqual(withGen.generated);
  });

  it("DISCARD clears generated and resets meta to idle", () => {
    const withGen = ascReducer(draft, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(draft),
      advisories: [],
      now: "2026-06-17T00:00:02.000Z",
    });
    const cleared = ascReducer(withGen, {
      type: "DISCARD_STEP8_GENERATION",
      now: "2026-06-17T00:00:03.000Z",
    });
    expect(cleared.generated).toBeUndefined();
    expect(cleared.meta.generation?.status).toBe("idle");
    expect(cleared.meta.generation?.stale).toBe(true);
    expect(cleared.meta.generation?.staleReason).toBe("never_generated");
  });

  it("APPLY with stale fingerprint records stale=true on arrival", () => {
    const beforeBusiness = draft.input.business.description;
    void beforeBusiness;
    const oldFingerprint = computeInputFingerprint(draft.input);
    // Mutate input AFTER snapshotting
    const mutated = ascReducer(draft, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Now different" },
    });
    const next = ascReducer(mutated, {
      type: "APPLY_STEP8_GENERATION",
      generated: makeGenerated(mutated, { inputFingerprint: oldFingerprint }),
      advisories: [],
      now: "2026-06-17T00:00:04.000Z",
    });
    expect(next.meta.generation?.status).toBe("success");
    expect(next.meta.generation?.stale).toBe(true);
    expect(next.meta.generation?.staleReason).toBe("input_changed");
    expect(next.generated).toBeDefined();
  });
});
