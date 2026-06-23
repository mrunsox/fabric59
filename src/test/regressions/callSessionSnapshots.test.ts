/**
 * Phase 7A — call_session_snapshots build contract regression.
 *
 * Covers the pure builder (`buildCallSessionSnapshotV1`). The DB capture path
 * and RLS are covered by separate edge / integration verification — keeping
 * unit tests deterministic per project convention.
 */
import { describe, it, expect } from "vitest";
import {
  buildCallSessionSnapshotV1,
  type BuildSnapshotInput,
} from "@/lib/workspace/callSessions/buildSnapshot";
import { SNAPSHOT_CONTRACT_VERSION, maskValuePreview } from "@/lib/workspace/callSessions/snapshotContract";
import type { CallSessionRow } from "@/lib/workspace/cockpit/callSession";
import type { KnowledgeBin } from "@/lib/workspace/cockpit/knowledgeBin";

const session: CallSessionRow = {
  id: "sess-1",
  organization_id: "org-1",
  workspace_id: "ws-1",
  tenant_id: null,
  campaign_id: "camp-1",
  agent_id: "agent-1",
  script_session_id: null,
  five9_call_id: "f9-1",
  ani: "5551230001",
  dnis: null,
  caller_name: null,
  phase: null,
  status: "acw",
  started_at: "2026-06-23T10:00:00Z",
  ended_at: null,
  duration_seconds: 120,
  metadata: {},
};

const bin: KnowledgeBin = {
  caller: { kind: "live_session", label: "Caller", description: "", items: [
    { id: "c1", sourceType: "live_session", sourceId: null, scope: "Live", label: "Caller ANI", body: "5551230001", approvalState: "n/a", freshness: "live", precedence: 1, topicKey: "caller_ani" },
  ] },
  instructions: { kind: "campaign_instruction", label: "Instr", description: "", items: [] },
  required: { kind: "required_field", label: "Req", description: "", items: [] },
  guide: { kind: "workspace_guide", label: "Guide", description: "", items: [
    { id: "g1", sourceType: "workspace_guide", sourceId: "s1", scope: "Canonical guide", label: "Hours", body: "9-5", approvalState: "n/a", freshness: "recent", precedence: 3, topicKey: "guide_hours" },
  ] },
  approved: { kind: "business_brain", label: "Approved", description: "", items: [
    { id: "b1", sourceType: "business_brain", sourceId: "f1", scope: "Approved", label: "Policy", body: "yes", approvalState: "approved", freshness: "fresh", precedence: 4, topicKey: "bb_policy" },
  ] },
  references: { kind: "supplementary", label: "Ref", description: "", items: [] },
  dispositions: { kind: "routing", label: "Disp", description: "", items: [
    { id: "d1", sourceType: "routing", sourceId: "x", scope: "Routing", label: "Booked", body: "...", approvalState: "n/a", freshness: "recent", precedence: Number.POSITIVE_INFINITY, topicKey: "disp_booked" },
  ] },
  conflicts: [],
  ordered: [],
};

function build(overrides: Partial<BuildSnapshotInput> = {}) {
  return buildCallSessionSnapshotV1({
    session,
    knowledgeBin: bin,
    events: [],
    outcome: null,
    latestNote: null,
    capturedAt: "2026-06-23T10:05:00Z",
    ...overrides,
  });
}

describe("Phase 7A — snapshot contract", () => {
  it("exposes a stable v1 version constant", () => {
    expect(SNAPSHOT_CONTRACT_VERSION).toBe(1);
  });

  it("includes all top-level keys", () => {
    const s = build();
    expect(Object.keys(s).sort()).toEqual(
      ["ai_assist", "events", "knowledge_bin", "outcome", "session"].sort(),
    );
  });

  it("maps phase via mapStatusToPhase (acw → wrap_up)", () => {
    const s = build();
    expect(s.session.phase).toBe("wrap_up");
  });

  it("maps completed phase when ended_at is present", () => {
    const s = build({ session: { ...session, status: "connected", ended_at: "2026-06-23T10:04:00Z" } });
    expect(s.session.phase).toBe("completed");
  });

  it("uses ANI as caller label with telephony provenance", () => {
    const s = build();
    expect(s.session.caller_label).toEqual({ value: "5551230001", source: "telephony" });
  });

  it("uses caller_name with brain provenance when present", () => {
    const s = build({ session: { ...session, caller_name: "Casey Chen" } });
    expect(s.session.caller_label).toEqual({ value: "Casey Chen", source: "brain" });
  });

  it("preserves Knowledge Bin precedence ordering and groups", () => {
    const s = build();
    const keys = s.knowledge_bin.groups.map((g) => g.key);
    expect(keys).toEqual(["caller", "guide", "approved", "dispositions"]);
    const prec = s.knowledge_bin.groups.map((g) => g.precedence);
    // Strictly non-decreasing precedence among non-routing groups.
    const factual = prec.filter((p) => Number.isFinite(p));
    for (let i = 1; i < factual.length; i++) expect(factual[i]).toBeGreaterThanOrEqual(factual[i - 1]);
  });

  it("emits empty knowledge_bin when bin is null", () => {
    const s = build({ knowledgeBin: null });
    expect(s.knowledge_bin.groups).toEqual([]);
    expect(s.knowledge_bin.captured_at).toBeTruthy();
  });

  it("populates outcome from disposition + note excerpt", () => {
    const s = build({
      outcome: { disposition: "Booked – new", outcome_type_id: "ot-1", summary: "sum" },
      latestNote: { note_text: "x".repeat(400), created_at: "2026-06-23T10:04:30Z" },
    });
    expect(s.outcome.disposition_label).toBe("Booked – new");
    expect(s.outcome.disposition_id).toBe("ot-1");
    expect(s.outcome.notes_excerpt?.length).toBe(280);
  });

  it("returns null outcome fields when nothing recorded", () => {
    const s = build();
    expect(s.outcome).toEqual({ disposition_id: null, disposition_label: null, notes_excerpt: null });
  });

  it("normalizes known event types and masks PII", () => {
    const s = build({
      events: [
        { timestamp: "2026-06-23T10:01:00Z", event_type: "phase_change", data: { from: "live", to: "wrap_up" } },
        { timestamp: "2026-06-23T10:01:30Z", event_type: "required_field_completed", data: { field_key: "email", value: "ada@example.com" } },
        { timestamp: "2026-06-23T10:02:00Z", event_type: "disposition_selected", data: { disposition_id: "d1", label: "Booked" } },
        { timestamp: "2026-06-23T10:02:30Z", event_type: "noise_we_ignore", data: {} },
      ],
    });
    expect(s.events.map((e) => e.type)).toEqual([
      "phase_change",
      "required_field_completed",
      "disposition_selected",
    ]);
    const field = s.events[1] as { value_preview: string };
    expect(field.value_preview).toContain("***");
    expect(field.value_preview).not.toContain("ada@example.com");
  });

  it("ai_assist is contract-shaped even when empty", () => {
    expect(build().ai_assist).toEqual({ used_suggestions: [] });
  });
});

describe("maskValuePreview", () => {
  it("masks short values", () => {
    expect(maskValuePreview("ab")).toBe("***");
  });
  it("masks long values keeping edges", () => {
    expect(maskValuePreview("abcdefghij")).toBe("ab***ij");
  });
  it("returns null for empty input", () => {
    expect(maskValuePreview(null)).toBeNull();
    expect(maskValuePreview("")).toBeNull();
  });
});
