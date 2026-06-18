/**
 * Phase 2 — ASC reducer invariants under BB-driven dispatches.
 *
 * Every `BbAscApplyIntent` must round-trip through ONE existing ASC action
 * type and leave the draft in a valid state. This guards the "no new bb_*
 * reducer actions" rule.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { AscAction } from "@/lib/asc/actions";

const ALLOWED_ACTION_TYPES = new Set<string>([
  "ADD_CALLER_REASON",
  "UPDATE_CALLER_REASON",
  "ADD_NOTIFICATION_EDIT",
  "SET_DESTINATION",
]);

function freshDraft() {
  return createEmptyAscDraft({
    id: "d-bb",
    workspaceId: "ws",
    createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
}

describe("Phase 2 — BB-driven dispatches use only existing ASC actions", () => {
  it("addCallerReason dispatches ADD_CALLER_REASON and updates state", () => {
    const action: AscAction = {
      type: "ADD_CALLER_REASON",
      reason: { id: "r-1", label: "Pricing", requiredCapture: [], opener: "We charge $X" },
    };
    expect(ALLOWED_ACTION_TYPES.has(action.type)).toBe(true);
    const next = ascReducer(freshDraft(), action);
    expect(next.input.callerReasons.map((r) => r.label)).toContain("Pricing");
  });

  it("appendRequiredCaptureToFirstReason maps to UPDATE_CALLER_REASON", () => {
    const seeded = ascReducer(freshDraft(), {
      type: "ADD_CALLER_REASON",
      reason: { id: "r-1", label: "Intake", requiredCapture: ["name"] },
    });
    const action: AscAction = {
      type: "UPDATE_CALLER_REASON",
      id: "r-1",
      patch: { requiredCapture: ["name", "phone"] },
    };
    expect(ALLOWED_ACTION_TYPES.has(action.type)).toBe(true);
    const next = ascReducer(seeded, action);
    expect(next.input.callerReasons[0].requiredCapture).toEqual(["name", "phone"]);
  });

  it("addNotificationEdit dispatches ADD_NOTIFICATION_EDIT", () => {
    const action: AscAction = {
      type: "ADD_NOTIFICATION_EDIT",
      notification: { id: "n-1", trigger: "after_hours", channel: "email" },
    };
    expect(ALLOWED_ACTION_TYPES.has(action.type)).toBe(true);
    const next = ascReducer(freshDraft(), action);
    expect(next.input.notificationsDraftEdits ?? []).toHaveLength(1);
  });

  it("setDestinationDeepLink dispatches SET_DESTINATION", () => {
    const action: AscAction = {
      type: "SET_DESTINATION",
      destination: {
        kind: "deep_link",
        deepLinkTemplate: "tel:5550109988",
        openMode: "new_tab",
      },
    };
    expect(ALLOWED_ACTION_TYPES.has(action.type)).toBe(true);
    const next = ascReducer(freshDraft(), action);
    expect(next.input.destination?.kind).toBe("deep_link");
    expect(next.input.destination?.deepLinkTemplate).toBe("tel:5550109988");
  });

  it("forked drafts ignore mutating dispatches (post-fork read-only)", () => {
    let d = freshDraft();
    d = ascReducer(d, {
      type: "MARK_FORKED",
      at: "2026-06-17T00:01:00.000Z",
      by: "u",
    });
    const next = ascReducer(d, {
      type: "ADD_CALLER_REASON",
      reason: { id: "r-bb", label: "Should be blocked", requiredCapture: [] },
    });
    expect(next.input.callerReasons.find((r) => r.id === "r-bb")).toBeUndefined();
  });
});
