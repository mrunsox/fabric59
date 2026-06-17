/**
 * ASC Slice 8 — readiness evaluator (pure, deterministic).
 *
 * Source hierarchy: confirmed ASC inputs are primary; generated draft is
 * used for structural checks and warnings. `no_generated_draft` and
 * `generation_stale` are always blockers.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeReadiness } from "@/lib/asc/readiness";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function readyDraft(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d1",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, { type: "UPDATE_BUSINESS", patch: { description: "Acme law firm" } });
  d = ascReducer(d, { type: "UPDATE_PURPOSE", patch: { primaryOutcome: "Book intake" } });
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
  return d;
}

function makeGenerated(d: AscDraft, overrides?: Partial<AscGenerated>): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(d.input),
    flow: {
      nodes: [
        { id: "br1", kind: "reason_branch", label: "New matter", reasonId: "r1" },
        { id: "o1", kind: "outcome", label: "Booked", outcomeRef: "Booked" },
      ],
      edges: [{ id: "e1", from: "br1", to: "o1" }],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n1"] }],
    notifications: [{ id: "n1", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" }],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: { slug: "acme" } },
    todos: [],
    confidenceByArea: {},
    ...overrides,
  };
}

function apply(d: AscDraft, gen: AscGenerated): AscDraft {
  return ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated: gen,
    advisories: [],
    now: "2026-06-17T00:01:00.000Z",
  });
}

describe("computeReadiness — blockers (Slice 8)", () => {
  it("empty draft surfaces no_generated_draft + input blockers", () => {
    const d = createEmptyAscDraft({
      id: "d", workspaceId: "ws", createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const report = computeReadiness(d);
    const ids = report.blockers.map((b) => b.id);
    expect(ids).toContain("no_generated_draft");
    expect(ids).toContain("no_caller_reasons");
    expect(ids).toContain("no_confirmed_outcomes");
    expect(ids).toContain("missing_destination_kind");
    expect(report.isSafeToFork).toBe(false);
  });

  it("fully ready inputs + fresh generation → isSafeToFork=true", () => {
    let d = readyDraft();
    d = apply(d, makeGenerated(d));
    const report = computeReadiness(d);
    expect(report.blockers).toEqual([]);
    expect(report.isSafeToFork).toBe(true);
  });

  it("external_url destination without a URL is a blocker", () => {
    let d = readyDraft();
    d = ascReducer(d, {
      type: "SET_DESTINATION",
      destination: { kind: "external_url" },
    });
    d = apply(d, makeGenerated(d));
    const ids = computeReadiness(d).blockers.map((b) => b.id);
    expect(ids).toContain("destination_requirement_missing");
  });

  it("deep_link destination without template is a blocker", () => {
    let d = readyDraft();
    d = ascReducer(d, {
      type: "SET_DESTINATION",
      destination: { kind: "deep_link" },
    });
    d = apply(d, makeGenerated(d));
    const ids = computeReadiness(d).blockers.map((b) => b.id);
    expect(ids).toContain("destination_requirement_missing");
  });

  it("empty generated.flow.nodes is a structural blocker", () => {
    let d = readyDraft();
    d = apply(d, makeGenerated(d, { flow: { nodes: [], edges: [] }, reasonToBranch: {} }));
    const ids = computeReadiness(d).blockers.map((b) => b.id);
    expect(ids).toContain("flow_empty");
  });

  it("unmapped caller reason → reasons_unmapped blocker", () => {
    let d = readyDraft();
    d = apply(d, makeGenerated(d, { reasonToBranch: {} }));
    const ids = computeReadiness(d).blockers.map((b) => b.id);
    expect(ids).toContain("reasons_unmapped");
  });

  // Scope-guard test: regenerate must clear stale; until then the CTA stays disabled.
  it("stale generation after upstream edit re-surfaces blocker and disables fork", () => {
    let d = readyDraft();
    d = apply(d, makeGenerated(d));
    // Confirm initially clean.
    expect(computeReadiness(d).isSafeToFork).toBe(true);

    // Material Step 1 change → reducer flips meta.generation.stale=true.
    d = ascReducer(d, {
      type: "UPDATE_BUSINESS",
      patch: { description: "Acme law firm (revised)" },
    });
    const report = computeReadiness(d);
    expect(report.blockers.map((b) => b.id)).toContain("generation_stale");
    expect(report.isSafeToFork).toBe(false);
  });
});

describe("computeReadiness — warnings + tolerance", () => {
  it("todos and low-confidence areas surface as warnings, isSafeToFork stays true", () => {
    let d = readyDraft();
    d = apply(
      d,
      makeGenerated(d, {
        todos: [
          { id: "t1", area: "copy", message: "Write opener" },
          { id: "t2", area: "notifications", message: "Pick channel" },
        ],
        confidenceByArea: { flow: { level: "low", reason: "Few branches" } },
      }),
    );
    const report = computeReadiness(d);
    expect(report.isSafeToFork).toBe(true);
    const ids = report.warnings.map((w) => w.id);
    expect(ids).toContain("todo_copy_t1");
    expect(ids).toContain("todo_notifications_t2");
    expect(ids).toContain("low_confidence_flow");
  });

  it("outcome without notifications surfaces a warning", () => {
    let d = readyDraft();
    d = apply(
      d,
      makeGenerated(d, {
        outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: [] }],
      }),
    );
    const ids = computeReadiness(d).warnings.map((w) => w.id);
    expect(ids).toContain("outcome_no_notifications_Booked");
  });

  it("malformed generated subtree does not throw and degrades safely", () => {
    let d = readyDraft();
    const broken = {
      schemaVersion: 1,
      generatedAt: "x",
      inputFingerprint: "x",
      flow: undefined as never,
      reasonToBranch: undefined as never,
      outcomes: undefined as never,
      notifications: undefined as never,
      destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
      todos: undefined as never,
      confidenceByArea: undefined as never,
    } as unknown as AscGenerated;
    d = apply(d, broken);
    const report = computeReadiness(d);
    // Must not throw, must surface flow_empty since nodes are missing.
    expect(report.blockers.some((b) => b.id === "flow_empty")).toBe(true);
  });

  it("issue order is deterministic across runs", () => {
    let d = readyDraft();
    d = apply(
      d,
      makeGenerated(d, {
        todos: [
          { id: "t1", area: "copy", message: "Write opener" },
          { id: "t2", area: "outcomes", message: "Confirm" },
        ],
        confidenceByArea: {
          flow: { level: "low" },
          copy: { level: "low" },
        },
      }),
    );
    const a = computeReadiness(d);
    const b = computeReadiness(d);
    expect(a.blockers.map((x) => x.id)).toEqual(b.blockers.map((x) => x.id));
    expect(a.warnings.map((x) => x.id)).toEqual(b.warnings.map((x) => x.id));
  });
});
