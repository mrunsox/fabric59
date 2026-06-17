import { describe, it, expect, beforeEach } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft, SEED_ASC_DRAFT } from "@/lib/asc/fixtures";
import {
  selectCanContinue,
  selectIsForked,
  selectIsResumable,
  selectStepStatus,
} from "@/lib/asc/selectors";
import type { AscDraft } from "@/lib/asc/types";

describe("ASC reducer skeleton (Slice 1)", () => {
  let draft: AscDraft;
  beforeEach(() => {
    draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-01-01T00:00:00.000Z",
    });
  });

  it("INIT_DRAFT replaces state wholesale", () => {
    const next = ascReducer(draft, { type: "INIT_DRAFT", draft: SEED_ASC_DRAFT });
    expect(next).toBe(SEED_ASC_DRAFT);
  });

  it("SET_STEP clamps to 1..10 and updates updatedAt", () => {
    const a = ascReducer(draft, { type: "SET_STEP", step: 99 });
    expect(a.step).toBe(10);
    const b = ascReducer(draft, { type: "SET_STEP", step: -5 });
    expect(b.step).toBe(1);
    const c = ascReducer(draft, { type: "SET_STEP", step: 4 });
    expect(c.step).toBe(4);
    expect(c.meta.updatedAt).not.toBe(draft.meta.updatedAt);
  });

  it("UPDATE_BUSINESS merges patches", () => {
    const next = ascReducer(draft, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Hello" },
    });
    expect(next.input.business.description).toBe("Hello");
    expect(next.input.business.industryPresetId).toBe("general");
  });

  it("caller-reason add/update/remove cycle is deterministic", () => {
    const added = ascReducer(draft, {
      type: "ADD_CALLER_REASON",
      reason: { id: "cr-1", label: "Intake", requiredCapture: [] },
    });
    expect(added.input.callerReasons).toHaveLength(1);

    const updated = ascReducer(added, {
      type: "UPDATE_CALLER_REASON",
      id: "cr-1",
      patch: { label: "New intake" },
    });
    expect(updated.input.callerReasons[0].label).toBe("New intake");

    const removed = ascReducer(updated, {
      type: "REMOVE_CALLER_REASON",
      id: "cr-1",
    });
    expect(removed.input.callerReasons).toHaveLength(0);
  });

  it("SET_DESTINATION and SET_LAUNCH set distinct namespaces", () => {
    const a = ascReducer(draft, {
      type: "SET_DESTINATION",
      destination: { kind: "external_url", externalUrl: "https://x" },
    });
    const b = ascReducer(a, {
      type: "SET_LAUNCH",
      launch: { slug: "demo", editableUntilPublish: true },
    });
    expect(b.input.destination?.kind).toBe("external_url");
    expect(b.input.launch?.slug).toBe("demo");
  });

  it("MARK_STEP_STATUS updates the specific step only", () => {
    const next = ascReducer(draft, {
      type: "MARK_STEP_STATUS",
      step: 3,
      status: "complete",
    });
    expect(selectStepStatus(next, 3)).toBe("complete");
    expect(selectStepStatus(next, 1)).toBe("in_progress");
  });

  it("selectCanContinue enforces Slice 1 minimums", () => {
    expect(selectCanContinue(draft, 1)).toBe(false);
    const withDesc = ascReducer(draft, {
      type: "UPDATE_BUSINESS",
      patch: { description: "x" },
    });
    expect(selectCanContinue(withDesc, 1)).toBe(true);

    expect(selectCanContinue(draft, 2)).toBe(false);
    const withPurpose = ascReducer(draft, {
      type: "UPDATE_PURPOSE",
      patch: { primaryOutcome: "Book intake" },
    });
    expect(selectCanContinue(withPurpose, 2)).toBe(true);

    expect(selectCanContinue(draft, 3)).toBe(false);
    const withReason = ascReducer(draft, {
      type: "ADD_CALLER_REASON",
      reason: { id: "cr", label: "x", requiredCapture: [] },
    });
    expect(selectCanContinue(withReason, 3)).toBe(true);

    // Permissive default for downstream steps in Slice 1
    expect(selectCanContinue(draft, 6)).toBe(true);
  });

  it("selectIsResumable / selectIsForked reflect draft.state", () => {
    expect(selectIsResumable(draft)).toBe(true);
    expect(selectIsForked(draft)).toBe(false);
    expect(selectIsForked({ ...draft, state: "forked" })).toBe(true);
  });

  it("forkToCanonical returns prefill (Slice 8); runner payload helper still pending", async () => {
    const mod = await import("@/lib/asc/reducer");
    const result = mod.forkToCanonical(draft);
    expect(result).toMatchObject({ source: "asc-wizard", ascDraftId: draft.id });
    expect(result.prefill).toBeTruthy();
    expect(() => mod.ascGeneratedToRunnerPayload()).toThrow(/not implemented/);
  });

});
