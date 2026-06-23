/**
 * Phase 6 — Canonical CallSessionState mapping layer.
 *
 * Single explicit lifecycle mapper for Cockpit, Supervisor, Runs, and QA.
 * Nothing else (no triggers, no hidden DB logic) is allowed to derive `phase`.
 *
 * Vocabulary:
 *   - `status`     : raw value persisted in `call_sessions.status`. Driven by
 *                    the Five9 webhook (`statusForEvent`) and free-form for
 *                    historical rows.
 *   - `phase`      : UI lifecycle stage used by the cockpit phase pill and the
 *                    supervisor presence overview. Always one of:
 *                       connecting | live | wrap_up | completed
 *   - `presence`   : per-agent rollup for the supervisor dashboard.
 *                       on-call | wrap-up | idle | offline
 *
 * Caller identity is a separate concern from telephony status:
 *   - `ani` is the canonical telephony identifier and never lies.
 *   - `caller_name` is an optional resolved display name. The UI always
 *     surfaces which source produced the label.
 */
export type CallPhase = "connecting" | "live" | "wrap_up" | "completed";
export type AgentPresenceState = "on-call" | "wrap-up" | "idle" | "offline";

export interface CallSessionRow {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  tenant_id: string | null;
  campaign_id: string | null;
  agent_id: string | null;
  script_session_id: string | null;
  five9_call_id: string | null;
  ani: string | null;
  dnis: string | null;
  caller_name: string | null;
  phase: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CallerIdentity {
  /** Always present — either the resolved name or the formatted ANI. */
  label: string;
  /** Raw ANI as reported by telephony. May be null when unavailable. */
  ani: string | null;
  /** Where the label came from. UI must keep this visible. */
  source: "caller_name" | "ani" | "unknown";
}

export interface CallPresenceSnapshot {
  /** Mapped lifecycle phase for the cockpit phase pill. */
  phase: CallPhase;
  /** Real telephony elapsed milliseconds, or null if no session row exists. */
  elapsedMs: number | null;
  /** Resolved caller identity for the header chip. */
  caller: CallerIdentity;
  /**
   * Whether telephony presence (a real `call_sessions` row) is available.
   * When false, the cockpit shows an honest "Telephony presence unavailable"
   * affordance instead of synthesizing fake state.
   */
  telephonyAvailable: boolean;
}

const TERMINAL_STATUSES = new Set(["ended", "disposed", "failed", "completed"]);
const WRAP_UP_STATUSES = new Set(["acw", "wrap_up", "wrapup", "wrap-up"]);
const CONNECTING_STATUSES = new Set(["queued", "ringing", "routing", "dialing"]);
const LIVE_STATUSES = new Set(["connected", "in_progress", "live", "talking"]);

/**
 * Map a persisted `call_sessions.status` (and optional explicit `phase` column)
 * onto the UI lifecycle. This is the only place that decision is allowed to
 * live — everything else reads `phase` from here.
 */
export function mapStatusToPhase(
  status: string | null | undefined,
  endedAt: string | null | undefined,
  explicitPhase?: string | null,
): CallPhase {
  // Explicit phase (column) wins when it's already canonical.
  if (explicitPhase && isCanonicalPhase(explicitPhase)) return explicitPhase;

  const raw = (status ?? "").toLowerCase();
  if (endedAt || TERMINAL_STATUSES.has(raw)) return "completed";
  if (WRAP_UP_STATUSES.has(raw)) return "wrap_up";
  if (CONNECTING_STATUSES.has(raw)) return "connecting";
  if (LIVE_STATUSES.has(raw)) return "live";
  // Unknown → assume live so legacy rows render sanely while still being live.
  return "live";
}

function isCanonicalPhase(value: string): value is CallPhase {
  return value === "connecting" || value === "live" || value === "wrap_up" || value === "completed";
}

/**
 * Resolve a caller identity from telephony + optional Business Brain context.
 * Provenance stays visible: UI renders `source` next to the label.
 */
export function resolveCallerIdentity(input: {
  ani: string | null | undefined;
  callerName: string | null | undefined;
}): CallerIdentity {
  const name = (input.callerName ?? "").trim();
  const ani = (input.ani ?? "").trim() || null;
  if (name) return { label: name, ani, source: "caller_name" };
  if (ani) return { label: ani, ani, source: "ani" };
  return { label: "Unknown caller", ani: null, source: "unknown" };
}

/**
 * Real-time elapsed milliseconds since `started_at`. Returns null when no
 * session row exists; callers may then fall back to a local-only timer with
 * an explicit "local timer" affordance.
 */
export function computeElapsedMs(
  session: Pick<CallSessionRow, "started_at" | "ended_at"> | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!session?.started_at) return null;
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : now.getTime();
  return Math.max(0, end - start);
}

/**
 * Build a presence snapshot. When `session` is null, telephony is unavailable
 * and the cockpit will surface that honestly.
 */
export function buildPresenceSnapshot(
  session: CallSessionRow | null,
  now: Date = new Date(),
): CallPresenceSnapshot {
  if (!session) {
    return {
      phase: "connecting",
      elapsedMs: null,
      caller: { label: "Telephony presence unavailable", ani: null, source: "unknown" },
      telephonyAvailable: false,
    };
  }
  return {
    phase: mapStatusToPhase(session.status, session.ended_at, session.phase),
    elapsedMs: computeElapsedMs(session, now),
    caller: resolveCallerIdentity({ ani: session.ani, callerName: session.caller_name }),
    telephonyAvailable: true,
  };
}

/**
 * Map a `call_sessions` row + optional agent record into a Supervisor presence
 * row. "offline" is reserved for agents whose `agents.status` is not `active`;
 * an active agent with no session is "idle". Agents with no record at all are
 * filtered upstream (Supervisor lists all *active workspace agents*).
 */
export function mapAgentPresence(input: {
  agentStatus: string | null | undefined;
  session: CallSessionRow | null;
}): AgentPresenceState {
  const agentStatus = (input.agentStatus ?? "").toLowerCase();
  if (agentStatus && agentStatus !== "active") return "offline";
  if (!input.session) return "idle";
  const phase = mapStatusToPhase(input.session.status, input.session.ended_at, input.session.phase);
  if (phase === "completed") return "idle";
  if (phase === "wrap_up") return "wrap-up";
  return "on-call";
}
