/**
 * Phase 5 · Slice 2 — reducer-level post-fork enforcement.
 *
 * The reducer is the real enforcement layer. After MARK_FORKED, every
 * mutating action must be silently no-op'd. Only lifecycle/navigation
 * actions (INIT_DRAFT, RESET_DRAFT, SET_STEP, TOUCH, MARK_FORKED) are
 * honored.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { computeInputFingerprint } from "@/lib/asc/step8CompileSchema";
import { selectIsReadOnly, selectIsForked } from "@/lib/asc/selectors";
import type { AscAction } from "@/lib/asc/actions";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";

function ready(): AscDraft {
  let d = createEmptyAscDraft({
    id: "d",
    workspaceId: "ws",
    createdBy: "u",
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
  const generated: AscGenerated = {
    schemaVersion: 1,
    generatedAt: "2026-06-17T00:01:00.000Z",
    inputFingerprint: computeInputFingerprint(d.input),
    flow: {
      nodes: [{ id: "br1", kind: "reason_branch", label: "x", reasonId: "r1" }],
      edges: [],
    },
    reasonToBranch: { r1: "br1" },
    outcomes: [{ outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n"] }],
    notifications: [
      { id: "n", outcomeRef: "Booked", channelRef: "slack", urgency: "normal" },
    ],
    destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
    todos: [],
    confidenceByArea: {},
  };
  d = ascReducer(d, {
    type: "APPLY_STEP8_GENERATION",
    generated,
    advisories: [],
    now: "2026-06-17T00:01:00.000Z",
  });
  return d;
}

function forked(): AscDraft {
  const d = ready();
  return ascReducer(d, {
    type: "MARK_FORKED",
    at: "2026-06-17T00:02:00.000Z",
    by: "user-1",
  });
}

const MUTATING_ACTIONS: AscAction[] = [
  { type: "UPDATE_BUSINESS", patch: { description: "tampered" } },
  { type: "UPDATE_PURPOSE", patch: { primaryOutcome: "tampered" } },
  {
    type: "ADD_CALLER_REASON",
    reason: { id: "r2", label: "Other", requiredCapture: [] },
  },
  { type: "UPDATE_CALLER_REASON", id: "r1", patch: { label: "tampered" } },
  { type: "REMOVE_CALLER_REASON", id: "r1" },
  { type: "SET_DESTINATION", destination: { kind: "external_url", externalUrl: "x" } },
  { type: "SET_LAUNCH", launch: { slug: "tampered" } },
  { type: "MARK_STEP_STATUS", step: 3, status: "complete" },
  {
    type: "APPLY_INTERVIEWER_TURN",
    step: 1,
    turn: {
      questionId: "q1",
      questionPrompt: "?",
      questionTargetField: null,
      questionInputKind: null,
      proposals: [],
      askedAt: "2026-06-17T00:03:00.000Z",
    },
  },
  { type: "CONFIRM_PROPOSED_FIELD", step: 1, proposalId: "p1" },
  { type: "REJECT_PROPOSED_FIELD", step: 1, proposalId: "p1" },
  { type: "CLEAR_INTERVIEWER_STEP", step: 1 },
  {
    type: "APPLY_GAP_FINDER_RESULT",
    step: 3,
    items: [],
    now: "2026-06-17T00:03:00.000Z",
  },
  { type: "DISMISS_GAP_ITEM", step: 3, itemId: "i1" },
  { type: "ADD_OUTCOME_EDIT", outcome: { id: "o2", label: "Tampered" } },
  { type: "UPDATE_OUTCOME_EDIT", id: "o1", patch: { label: "tampered" } },
  { type: "REMOVE_OUTCOME_EDIT", id: "o1" },
  {
    type: "ADD_NOTIFICATION_EDIT",
    notification: { id: "nx", trigger: "Booked", channel: "slack" },
  },
  { type: "UPDATE_NOTIFICATION_EDIT", id: "nx", patch: { note: "high" } },
  { type: "REMOVE_NOTIFICATION_EDIT", id: "nx" },
  {
    type: "APPLY_LOGIC_ARCHITECT_RESULT",
    step: 5,
    proposals: [],
    advisories: [],
    now: "2026-06-17T00:03:00.000Z",
  },
  { type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL", step: 5, proposalId: "lap1" },
  { type: "REJECT_LOGIC_ARCHITECT_PROPOSAL", step: 5, proposalId: "lap1" },
  {
    type: "EDIT_LOGIC_ARCHITECT_PROPOSAL",
    step: 5,
    proposalId: "lap1",
    nextValue: { kind: "outcome", value: { label: "tampered" } } as never,
  },
  { type: "CLEAR_LOGIC_ARCHITECT_STEP", step: 5 },
  { type: "BEGIN_STEP8_GENERATION", now: "2026-06-17T00:03:00.000Z" },
  {
    type: "FAIL_STEP8_GENERATION",
    now: "2026-06-17T00:03:00.000Z",
    error: { code: "validation_failed", message: "x" } as never,
  },
  { type: "DISCARD_STEP8_GENERATION", now: "2026-06-17T00:03:00.000Z" },
];

describe("Phase 5 · Slice 2 — post-fork reducer enforcement", () => {
  it("selectIsReadOnly is true after MARK_FORKED", () => {
    const d = forked();
    expect(selectIsReadOnly(d)).toBe(true);
    expect(selectIsForked(d)).toBe(true);
  });

  it.each(MUTATING_ACTIONS.map((a) => [a.type, a] as const))(
    "no-ops mutating action %s when draft is forked (referential identity preserved)",
    (_type, action) => {
      const d = forked();
      const next = ascReducer(d, action);
      // Strict referential equality — the guard returns the same state.
      expect(next).toBe(d);
    },
  );

  it("non-form action paths (APPLY_STEP8_GENERATION, gap finder) are also blocked", () => {
    // Explicit coverage requested by reviewer: at least one non-form action.
    const d = forked();
    const fakeGen: AscGenerated = {
      schemaVersion: 1,
      generatedAt: "2026-06-17T00:99:00.000Z",
      inputFingerprint: "tampered",
      flow: { nodes: [], edges: [] },
      reasonToBranch: {},
      outcomes: [],
      notifications: [],
      destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
      todos: [],
      confidenceByArea: {},
    };
    const next = ascReducer(d, {
      type: "APPLY_STEP8_GENERATION",
      generated: fakeGen,
      advisories: [],
      now: "2026-06-17T00:99:00.000Z",
    });
    expect(next).toBe(d);
    expect(next.generated?.inputFingerprint).not.toBe("tampered");
  });

  it("allows SET_STEP navigation after fork (read-only browsing)", () => {
    const d = forked();
    const next = ascReducer(d, { type: "SET_STEP", step: 3 });
    expect(next).not.toBe(d);
    expect(next.step).toBe(3);
    expect(next.state).toBe("forked");
  });

  it("allows TOUCH bookkeeping after fork", () => {
    const d = forked();
    const next = ascReducer(d, { type: "TOUCH", now: "2026-06-17T00:05:00.000Z" });
    expect(next).not.toBe(d);
    expect(next.state).toBe("forked");
    expect(next.meta.updatedAt).toBe("2026-06-17T00:05:00.000Z");
  });

  it("allows INIT_DRAFT / RESET_DRAFT lifecycle actions after fork", () => {
    const d = forked();
    const replacement = createEmptyAscDraft({
      id: "d2",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T01:00:00.000Z",
    });
    const initNext = ascReducer(d, { type: "INIT_DRAFT", draft: replacement });
    expect(initNext).toBe(replacement);
    const resetNext = ascReducer(d, { type: "RESET_DRAFT", draft: replacement });
    expect(resetNext).toBe(replacement);
  });

  it("repeat MARK_FORKED is still idempotent (allowed but no-op via inner guard)", () => {
    const d = forked();
    const again = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:99:00.000Z",
      by: "user-1",
    });
    expect(again).toBe(d);
    expect(again.forks).toHaveLength(1);
  });
});
