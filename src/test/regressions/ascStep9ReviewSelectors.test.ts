/**
 * ASC Slice 7 — Step 9 review selectors.
 *
 * Covers:
 *  - Flow outline derivation across reason → handling → outcome.
 *  - Outcomes overview joins fromReasonIds back to reason labels.
 *  - Notifications grouped by outcome.
 *  - Destination overview prefers generated.destinationLaunch.
 *  - Todos selector merges generated.todos + low-confidence areas with
 *    jumpToStep mapping.
 *  - All selectors render safely on a missing or partially-malformed
 *    `generated` subtree.
 */
import { describe, it, expect } from "vitest";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";
import {
  selectDestinationOverview,
  selectFlowOutline,
  selectNotificationsByOutcome,
  selectOutcomesOverview,
  selectReviewOverview,
  selectReviewTodos,
} from "@/lib/asc/selectors";

function makeDraft(generated?: Partial<AscGenerated> | null): AscDraft {
  const d = createEmptyAscDraft({
    id: "d",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d.input.business.description = "Acme law firm";
  d.input.purpose.primaryOutcome = "Book consult";
  d.input.callerReasons = [
    { id: "r1", label: "New matter", requiredCapture: [] },
    { id: "r2", label: "Existing client", requiredCapture: [] },
  ];
  if (generated !== undefined && generated !== null) {
    d.generated = {
      schemaVersion: 1,
      generatedAt: "2026-06-17T00:01:00.000Z",
      inputFingerprint: "x",
      flow: { nodes: [], edges: [] },
      reasonToBranch: {},
      outcomes: [],
      notifications: [],
      destinationLaunch: { destination: { kind: "internal_runner" }, launch: {} },
      todos: [],
      confidenceByArea: {},
      ...generated,
    } as AscGenerated;
  }
  return d;
}

describe("Step 9 selectors — happy path", () => {
  const draft = makeDraft({
    flow: {
      nodes: [
        { id: "br1", kind: "reason_branch", label: "New matter", reasonId: "r1" },
        { id: "h1", kind: "handling", label: "Intake script" },
        { id: "o1", kind: "outcome", label: "Booked", outcomeRef: "Booked" },
        { id: "br2", kind: "reason_branch", label: "Existing client", reasonId: "r2" },
        { id: "o2", kind: "outcome", label: "Transferred", outcomeRef: "Transferred" },
      ],
      edges: [
        { id: "e1", from: "br1", to: "h1" },
        { id: "e2", from: "h1", to: "o1" },
        { id: "e3", from: "br2", to: "o2" },
      ],
    },
    reasonToBranch: { r1: "br1", r2: "br2" },
    outcomes: [
      { outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n1"] },
      { outcomeRef: "Transferred", fromReasonIds: ["r2"], notificationRefs: [] },
    ],
    notifications: [
      {
        id: "n1",
        outcomeRef: "Booked",
        channelRef: "slack",
        urgency: "normal",
        note: "Notify intake",
      },
      {
        id: "n2",
        outcomeRef: "Booked",
        channelRef: "email",
        urgency: "low",
      },
    ],
    destinationLaunch: {
      destination: {
        kind: "external_url",
        externalUrl: "https://acme.example/intake",
        openMode: "new_tab",
      },
      launch: { slug: "acme-intake" },
    },
    todos: [
      { id: "t1", area: "copy", message: "Write opener" },
      { id: "t2", area: "notifications", message: "Verify Slack channel" },
    ],
    confidenceByArea: {
      flow: { level: "low", reason: "Few branches captured" },
      copy: { level: "high" },
    },
  });

  it("flow outline links reasons to handling and outcomes", () => {
    const rows = selectFlowOutline(draft);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      reasonId: "r1",
      handlingLabels: ["Intake script"],
      outcomeLabels: ["Booked"],
    });
    expect(rows[1]).toMatchObject({
      reasonId: "r2",
      handlingLabels: [],
      outcomeLabels: ["Transferred"],
    });
  });

  it("outcomes overview joins reason labels", () => {
    const rows = selectOutcomesOverview(draft);
    expect(rows[0]).toEqual({
      outcomeRef: "Booked",
      fromReasonLabels: ["New matter"],
      notificationCount: 1,
    });
  });

  it("notifications grouped by outcome", () => {
    const grouped = selectNotificationsByOutcome(draft);
    expect(grouped.Booked).toHaveLength(2);
    expect(grouped.Transferred).toBeUndefined();
  });

  it("destination prefers generated.destinationLaunch", () => {
    const d = selectDestinationOverview(draft);
    expect(d.kind).toBe("external_url");
    expect(d.slug).toBe("acme-intake");
    expect(d.externalUrl).toContain("acme.example");
  });

  it("review todos merge todos + low-confidence areas with step jumps", () => {
    const rows = selectReviewTodos(draft);
    const todoIds = rows.map((r) => r.id);
    expect(todoIds).toContain("t1");
    expect(todoIds).toContain("low-flow");
    const low = rows.find((r) => r.id === "low-flow");
    expect(low?.source).toBe("low_confidence");
    expect(low?.jumpToStep).toBe(4);
    const notif = rows.find((r) => r.id === "t2");
    expect(notif?.jumpToStep).toBe(6);
    // High-confidence area should not produce a row.
    expect(rows.find((r) => r.id === "low-copy")).toBeUndefined();
  });

  it("overview returns generatedAt and counts", () => {
    const o = selectReviewOverview(draft);
    expect(o.hasGenerated).toBe(true);
    expect(o.callerReasonCount).toBe(2);
    expect(o.outcomeCount).toBe(2);
    expect(o.notificationCount).toBe(2);
    expect(o.generatedAt).toBe("2026-06-17T00:01:00.000Z");
  });
});

describe("Step 9 selectors — no generated draft", () => {
  const draft = makeDraft();

  it("flow outline returns reasons with empty handling/outcomes", () => {
    const rows = selectFlowOutline(draft);
    expect(rows).toHaveLength(2);
    expect(rows[0].handlingLabels).toEqual([]);
    expect(rows[0].outcomeLabels).toEqual([]);
  });

  it("outcomes/notifications/todos are empty", () => {
    expect(selectOutcomesOverview(draft)).toEqual([]);
    expect(selectNotificationsByOutcome(draft)).toEqual({});
    expect(selectReviewTodos(draft)).toEqual([]);
  });

  it("destination falls back to input only (no slug if absent)", () => {
    const d = selectDestinationOverview(draft);
    expect(d.kind).toBeUndefined();
    expect(d.slug).toBeUndefined();
  });

  it("overview reports hasGenerated=false but business fields populated", () => {
    const o = selectReviewOverview(draft);
    expect(o.hasGenerated).toBe(false);
    expect(o.businessDescription).toBe("Acme law firm");
    expect(o.nodeCount).toBe(0);
  });
});

describe("Step 9 selectors — malformed / partial generated subtree", () => {
  it("tolerates missing flow + dangling reasonToBranch + nullish entries", () => {
    const draft = makeDraft({
      // No flow at all — selectors must not throw.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flow: undefined as any,
      reasonToBranch: { r1: "missing-node-id" },
      outcomes: [
        // outcome referencing an unknown reason id should still render with empty labels
        { outcomeRef: "Booked", fromReasonIds: ["ghost"], notificationRefs: [] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        null as any,
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifications: [null as any, { id: "n1", outcomeRef: "", channelRef: "x", urgency: "low" } as any],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      todos: [null as any, { id: "t1", area: "copy", message: "ok" }],
      confidenceByArea: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outcomes: undefined as any,
      },
    });

    expect(() => selectFlowOutline(draft)).not.toThrow();
    const outline = selectFlowOutline(draft);
    expect(outline[0].handlingLabels).toEqual([]);
    expect(outline[0].outcomeLabels).toEqual([]);

    const outcomes = selectOutcomesOverview(draft);
    // Filtered the null entry; ghost reason id resolved to empty labels.
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].fromReasonLabels).toEqual([]);

    const grouped = selectNotificationsByOutcome(draft);
    // Empty outcomeRef and null entries are skipped.
    expect(grouped).toEqual({});

    const todos = selectReviewTodos(draft);
    expect(todos.map((t) => t.id)).toEqual(["t1"]);

    const dest = selectDestinationOverview(draft);
    expect(dest.kind).toBe("internal_runner");
  });
});
