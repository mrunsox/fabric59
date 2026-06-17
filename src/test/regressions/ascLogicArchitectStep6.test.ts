/**
 * ASC Slice 5 — Step 6 notifications grounding hook behavior.
 *
 * Uses the reducer directly to assert end-state behavior the hook produces:
 *   - Notification proposals confirm against the flat AscNotificationEdit shape
 *     while preserving outcome/channel/audience/urgency in `note`.
 *   - Duplicate (outcomeRef + channelRef) confirm is a no-op write but flips
 *     status to confirmed.
 *   - Ungrounded channelRef proposals (caller responsibility to filter) would
 *     never become confirmable — represented here by an `ungrounded` stale.
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { snapshotForLaProposal } from "@/lib/asc/logicArchitectSchema";
import type { AscDraft, AscLogicArchitectProposal } from "@/lib/asc/types";

function notifProposal(
  draft: AscDraft,
  v: { outcomeRef: string; channelRef: string; audienceRef?: string; urgency?: "low" | "normal" | "high"; note?: string },
  id = "la-n",
): AscLogicArchitectProposal {
  return {
    id,
    step: 6,
    targetField: "notifications.add",
    value: {
      outcomeRef: v.outcomeRef,
      channelRef: v.channelRef,
      audienceRef: v.audienceRef,
      urgency: v.urgency ?? "normal",
      note: v.note,
    },
    confidence: "high",
    rationale: "Right team for this outcome.",
    status: "pending",
    fieldSnapshot: snapshotForLaProposal(draft.input, "notifications.add"),
    issuedAt: "2026-06-17T00:00:00.000Z",
  };
}

describe("ASC Logic Architect Step 6 (Slice 5)", () => {
  it("Confirm writes a flat notification edit preserving audience+urgency in note", () => {
    const draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 6,
      proposals: [
        notifProposal(draft, {
          outcomeRef: "Booked consult",
          channelRef: "slack:#intake",
          audienceRef: "intake-team",
          urgency: "high",
          note: "Page the on-call.",
        }),
      ],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 6,
      proposalId: "la-n",
    });
    expect(b.input.notificationsDraftEdits).toHaveLength(1);
    const n = b.input.notificationsDraftEdits![0];
    expect(n.trigger).toBe("Booked consult");
    expect(n.channel).toBe("slack:#intake");
    expect(n.note).toContain("audience: intake-team");
    expect(n.note).toContain("urgency: high");
    expect(n.note).toContain("Page the on-call.");
  });

  it("Duplicate (outcomeRef+channelRef) confirm is a no-op write", () => {
    let draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    draft = ascReducer(draft, {
      type: "ADD_NOTIFICATION_EDIT",
      notification: {
        id: "n-existing",
        trigger: "Booked Consult",
        channel: "Slack:#Intake",
      },
    });
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 6,
      proposals: [
        notifProposal(draft, {
          outcomeRef: "booked consult",
          channelRef: "slack:#intake",
        }),
      ],
      advisories: [],
      now: "2026-06-17T00:00:01.000Z",
    });
    const b = ascReducer(a, {
      type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
      step: 6,
      proposalId: "la-n",
    });
    expect(b.input.notificationsDraftEdits).toHaveLength(1);
    expect(b.meta.logicArchitect?.proposalsByStep[6]?.[0].status).toBe(
      "confirmed",
    );
  });

  it("Advisory-only when no proposals confirmable", () => {
    // Simulates hook behavior: empty proposals + advisory message.
    const draft = createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws",
      createdBy: "u",
      now: "2026-06-17T00:00:00.000Z",
    });
    const a = ascReducer(draft, {
      type: "APPLY_LOGIC_ARCHITECT_RESULT",
      step: 6,
      proposals: [],
      advisories: [
        {
          message:
            "Connect a notification destination to enable confirmable rule suggestions.",
        },
      ],
      now: "2026-06-17T00:00:01.000Z",
    });
    expect(a.meta.logicArchitect?.proposalsByStep[6]).toHaveLength(0);
    expect(a.meta.logicArchitect?.advisoriesByStep[6]).toHaveLength(1);
  });
});
