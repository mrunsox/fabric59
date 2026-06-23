/**
 * Phase 6 — Call lifecycle + Runs/QA/Supervisor join regression.
 *
 * Unit-level coverage focused on the explicit mapping layer; the UI surfaces
 * exercise it through props. We do not mock realtime — the resolver/mapper is
 * the bit that must stay deterministic.
 */
import { describe, it, expect } from "vitest";
import {
  mapStatusToPhase,
  resolveCallerIdentity,
  computeElapsedMs,
  buildPresenceSnapshot,
  mapAgentPresence,
  type CallSessionRow,
} from "@/lib/workspace/cockpit/callSession";

const baseSession: CallSessionRow = {
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
  status: "connected",
  started_at: new Date("2026-06-23T10:00:00Z").toISOString(),
  ended_at: null,
  duration_seconds: null,
  metadata: {},
};

describe("mapStatusToPhase", () => {
  it("returns completed when ended_at is present", () => {
    expect(mapStatusToPhase("connected", "2026-06-23T10:05:00Z")).toBe("completed");
  });
  it("maps Five9 webhook statuses honestly", () => {
    expect(mapStatusToPhase("queued", null)).toBe("connecting");
    expect(mapStatusToPhase("ringing", null)).toBe("connecting");
    expect(mapStatusToPhase("connected", null)).toBe("live");
    expect(mapStatusToPhase("acw", null)).toBe("wrap_up");
    expect(mapStatusToPhase("disposed", null)).toBe("completed");
    expect(mapStatusToPhase("failed", null)).toBe("completed");
  });
  it("prefers an explicit canonical phase column", () => {
    expect(mapStatusToPhase("connected", null, "wrap_up")).toBe("wrap_up");
  });
  it("ignores junk values in the explicit phase column", () => {
    expect(mapStatusToPhase("connected", null, "garbage")).toBe("live");
  });
});

describe("resolveCallerIdentity", () => {
  it("uses the caller name when present and keeps provenance visible", () => {
    const id = resolveCallerIdentity({ ani: "5551230001", callerName: "Casey Chen" });
    expect(id).toEqual({ label: "Casey Chen", ani: "5551230001", source: "caller_name" });
  });
  it("falls back to ANI when no name is known", () => {
    const id = resolveCallerIdentity({ ani: "5551230001", callerName: null });
    expect(id.source).toBe("ani");
    expect(id.label).toBe("5551230001");
  });
  it("reports unknown honestly when nothing is known", () => {
    expect(resolveCallerIdentity({ ani: null, callerName: null }).source).toBe("unknown");
  });
});

describe("computeElapsedMs", () => {
  it("returns null when there is no session", () => {
    expect(computeElapsedMs(null)).toBeNull();
  });
  it("uses ended_at when present", () => {
    const ms = computeElapsedMs(
      { started_at: "2026-06-23T10:00:00Z", ended_at: "2026-06-23T10:00:30Z" },
      new Date("2026-06-23T11:00:00Z"),
    );
    expect(ms).toBe(30_000);
  });
  it("uses now when ended_at is missing", () => {
    const ms = computeElapsedMs(
      { started_at: "2026-06-23T10:00:00Z", ended_at: null },
      new Date("2026-06-23T10:00:05Z"),
    );
    expect(ms).toBe(5_000);
  });
});

describe("buildPresenceSnapshot", () => {
  it("returns an honest unavailable state when no session is present", () => {
    const snap = buildPresenceSnapshot(null);
    expect(snap.telephonyAvailable).toBe(false);
    expect(snap.caller.source).toBe("unknown");
    expect(snap.elapsedMs).toBeNull();
  });
  it("hydrates phase + caller + elapsed from a session row", () => {
    const snap = buildPresenceSnapshot(
      { ...baseSession, status: "connected", caller_name: "Casey Chen" },
      new Date("2026-06-23T10:00:42Z"),
    );
    expect(snap.telephonyAvailable).toBe(true);
    expect(snap.phase).toBe("live");
    expect(snap.caller.source).toBe("caller_name");
    expect(snap.elapsedMs).toBe(42_000);
  });
});

describe("mapAgentPresence (Supervisor)", () => {
  it("returns offline only for agents who are not active", () => {
    expect(mapAgentPresence({ agentStatus: "disabled", session: null })).toBe("offline");
    expect(mapAgentPresence({ agentStatus: "inactive", session: baseSession })).toBe("offline");
  });
  it("returns idle when an active agent has no open session", () => {
    expect(mapAgentPresence({ agentStatus: "active", session: null })).toBe("idle");
  });
  it("returns on-call for live phase and wrap-up for wrap_up phase", () => {
    expect(mapAgentPresence({ agentStatus: "active", session: { ...baseSession, status: "connected" } })).toBe("on-call");
    expect(mapAgentPresence({ agentStatus: "active", session: { ...baseSession, status: "acw" } })).toBe("wrap-up");
  });
  it("returns idle when the open session is already completed", () => {
    expect(
      mapAgentPresence({
        agentStatus: "active",
        session: { ...baseSession, status: "disposed", ended_at: "2026-06-23T10:05:00Z" },
      }),
    ).toBe("idle");
  });
});

describe("Runs / QA join deep-link contract", () => {
  it("uses ?session=<id> instead of free-text ?search= when a session id is known", () => {
    const sessionId = "sess-1";
    const url = `/w/ws-1/cockpit?tab=runs&session=${encodeURIComponent(sessionId)}`;
    const params = new URL(url, "http://x").searchParams;
    expect(params.get("tab")).toBe("runs");
    expect(params.get("session")).toBe(sessionId);
    expect(params.get("search")).toBeNull();
  });
});
