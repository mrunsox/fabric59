/**
 * ASC Slice 8 — MARK_FORKED reducer behavior + idempotency.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { selectCanFork, selectIsForked, selectReadinessReport } from "@/lib/asc/selectors";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function ready(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Acme" } });
  d = ascReducer(d, { type: "UPDATE_PURPOSE", patch: { primaryOutcome: "Book" } });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "New matter", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "ADD_OUTCOME_EDIT",
    outcome: { id: "o1", label: "Booked" },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "internal_runner" },
  });
  const gen: AscGenerated = {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(d.input),
    flow: {
      nodes: [{ id: "br1", kind: "reason_branch", label: "x", reasonId: "r1" }],
      edges: [],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n"] }],
    notifications: [{ id: "n", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" }],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [],
    confidenceByArea: {},
  };
  d = ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated: gen,
    advisories: [],
    now: "2026-06-17T00:01:00.000Z",
  });
  return d;
}

describe("MARK_FORKED — Slice 8", () => {
  it("flips state to forked and appends a fork record", () => {
    const d = ready();
    expect(selectCanFork(d)).toBe(true);
    const f = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:02:00.000Z",
      by: "user-1",
    });
    expect(f.state).toBe("forked");
    expect(f.forks).toHaveLength(1);
    expect(f.forks[0]).toEqual({
      at: "2026-06-17T00:02:00.000Z",
      by: "user-1",
      target: "canonical_builder",
    });
    expect(selectIsForked(f)).toBe(true);
    expect(selectCanFork(f)).toBe(false);
  });

  it("does NOT flip generation.stale (fork is not an input mutation)", () => {
    const d = ready();
    expect(d.meta.generation?.stale).toBe(false);
    const f = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:02:00.000Z",
      by: "user-1",
    });
    expect(f.meta.generation?.stale).toBe(false);
  });

  it("is idempotent: repeat MARK_FORKED dispatches are no-ops, fork record is not duplicated", () => {
    const d = ready();
    const a = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:02:00.000Z",
      by: "user-1",
    });
    const b = ascReducer(a, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:03:00.000Z",
      by: "user-1",
    });
    expect(b).toBe(a); // same reference
    expect(b.forks).toHaveLength(1);
  });

  it("stale generation blocks fork even when other inputs are valid", () => {
    let d = ready();
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Acme (revised)" },
    });
    expect(d.meta.generation?.stale).toBe(true);
    const report = selectReadinessReport(d);
    expect(report.isSafeToFork).toBe(false);
    expect(selectCanFork(d)).toBe(false);
  });
});
