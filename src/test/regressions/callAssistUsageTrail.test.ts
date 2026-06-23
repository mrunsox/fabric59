/**
 * Phase 7B — Assist usage trail regression.
 *
 * Covers the pure builder mapping from `call_assist_events` rows into the
 * snapshot's `ai_assist.used_suggestions` slice.
 */
import { describe, it, expect } from "vitest";
import { buildCallSessionSnapshotV1 } from "@/lib/workspace/callSessions/buildSnapshot";
import type { CallSessionRow } from "@/lib/workspace/cockpit/callSession";

const session: CallSessionRow = {
  id: "sess-1",
  organization_id: "org-1",
  workspace_id: "ws-1",
  tenant_id: null,
  campaign_id: "camp-1",
  agent_id: "agent-1",
  script_session_id: null,
  five9_call_id: null,
  ani: "5551230001",
  dnis: null,
  caller_name: null,
  phase: "completed",
  status: "completed",
  started_at: "2026-06-23T10:00:00Z",
  ended_at: "2026-06-23T10:04:00Z",
  duration_seconds: 240,
  metadata: {},
};

describe("Phase 7B — assist usage trail in snapshot", () => {
  it("maps logged suggestion_used events into ai_assist.used_suggestions", () => {
    const snap = buildCallSessionSnapshotV1({
      session,
      knowledgeBin: null,
      events: [],
      outcome: null,
      latestNote: null,
      assistEvents: [
        {
          created_at: "2026-06-23T10:01:00Z",
          suggestion_id: "say-greeting",
          source_type: "business_brain",
          source_precedence: 4,
          action: "copied",
        },
        {
          created_at: "2026-06-23T10:02:00Z",
          suggestion_id: "ask-next",
          source_type: "workspace_guide",
          source_precedence: 3,
          action: "accepted",
        },
      ],
    });
    expect(snap.ai_assist.used_suggestions).toHaveLength(2);
    expect(snap.ai_assist.used_suggestions[0]).toMatchObject({
      suggestion_id: "say-greeting",
      action: "copied",
      source_type: "business_brain",
      source_precedence: 4,
    });
    expect(snap.ai_assist.used_suggestions[1]).toMatchObject({
      suggestion_id: "ask-next",
      action: "accepted",
      source_type: "workspace_guide",
      source_precedence: 3,
    });
  });

  it("drops rows with missing suggestion_id or action", () => {
    const snap = buildCallSessionSnapshotV1({
      session,
      knowledgeBin: null,
      events: [],
      outcome: null,
      latestNote: null,
      assistEvents: [
        { created_at: "2026-06-23T10:01:00Z", suggestion_id: null, source_type: "x", source_precedence: 1, action: "copied" },
        { created_at: "2026-06-23T10:01:30Z", suggestion_id: "ok", source_type: "x", source_precedence: 1, action: null },
      ],
    });
    expect(snap.ai_assist.used_suggestions).toEqual([]);
  });

  it("defaults missing precedence/source_type without throwing", () => {
    const snap = buildCallSessionSnapshotV1({
      session,
      knowledgeBin: null,
      events: [],
      outcome: null,
      latestNote: null,
      assistEvents: [
        { created_at: "2026-06-23T10:01:00Z", suggestion_id: "s1", source_type: null, source_precedence: null, action: "accepted" },
      ],
    });
    expect(snap.ai_assist.used_suggestions[0]).toMatchObject({
      suggestion_id: "s1",
      action: "accepted",
      source_precedence: 0,
    });
  });
});
