/**
 * Phase 7A — Server-side capture path for call_session_snapshots.
 *
 * Single, idempotent-friendly entry: persistSessionSnapshot(supabase, callSessionId).
 * Called once when a call_sessions row transitions into `wrap_up` or
 * `completed`. Failures are logged and swallowed so they never block the
 * lifecycle write.
 *
 * Snapshots are a DERIVED, APPEND-ONLY READ MODEL. The contract (v1) is
 * mirrored in `src/lib/workspace/callSessions/snapshotContract.ts` —
 * keep them in lockstep.
 */

const TERMINAL = new Set(["ended", "disposed", "failed", "completed"]);
const WRAP = new Set(["acw", "wrap_up", "wrapup", "wrap-up"]);
const CONNECTING = new Set(["queued", "ringing", "routing", "dialing"]);

function mapStatusToPhase(status: string | null | undefined, endedAt: string | null | undefined, explicit?: string | null): string {
  if (explicit && ["connecting", "live", "wrap_up", "completed"].includes(explicit)) return explicit;
  const raw = (status ?? "").toLowerCase();
  if (endedAt || TERMINAL.has(raw)) return "completed";
  if (WRAP.has(raw)) return "wrap_up";
  if (CONNECTING.has(raw)) return "connecting";
  return "live";
}

function maskValuePreview(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  if (!s) return null;
  const at = s.indexOf("@");
  if (at > 1) return `${s[0]}***${s.slice(at - 1)}`;
  if (s.length <= 2) return "***";
  if (s.length <= 6) return `${s[0]}***${s.slice(-1)}`;
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

export async function buildSessionSnapshot(supabase: any, callSessionId: string): Promise<Record<string, unknown> | null> {
  const { data: session, error: sessionErr } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", callSessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    console.warn("[snapshot] no session for", callSessionId, sessionErr);
    return null;
  }

  const [{ data: events }, { data: outcome }, { data: note }] = await Promise.all([
    supabase
      .from("call_session_events")
      .select("timestamp,event_type,data")
      .eq("call_session_id", callSessionId)
      .order("timestamp", { ascending: true })
      .limit(500),
    supabase
      .from("call_outcomes")
      .select("disposition,outcome_type_id,summary,created_at")
      .eq("call_session_id", callSessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("call_notes")
      .select("note_text,created_at")
      .eq("call_session_id", callSessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const phase = mapStatusToPhase(session.status, session.ended_at, session.phase);
  const callerLabel = session.caller_name
    ? { value: session.caller_name, source: "brain" as const }
    : session.ani
      ? { value: session.ani, source: "telephony" as const }
      : { value: "Unknown caller", source: "unknown" as const };

  const eventList: Array<Record<string, unknown>> = [];
  for (const r of (events ?? []) as Array<{ timestamp: string; event_type: string; data: Record<string, unknown> | null }>) {
    const t = (r.event_type || "").toLowerCase();
    if (t === "phase_change" || t === "phase_transition") {
      eventList.push({ ts: r.timestamp, type: "phase_change", from: r.data?.from ?? null, to: r.data?.to ?? "" });
    } else if (t === "required_field_completed" || t === "field_completed") {
      eventList.push({
        ts: r.timestamp,
        type: "required_field_completed",
        field_key: String(r.data?.field_key ?? r.data?.key ?? ""),
        value_preview: maskValuePreview(r.data?.value),
      });
    } else if (t === "disposition_selected" || t === "disposition") {
      eventList.push({
        ts: r.timestamp,
        type: "disposition_selected",
        disposition_id: r.data?.disposition_id ?? null,
        label: String(r.data?.label ?? outcome?.disposition ?? ""),
      });
    }
  }

  return {
    session: {
      id: session.id,
      workspace_id: session.workspace_id,
      campaign_id: session.campaign_id ?? null,
      agent_id: session.agent_id ?? null,
      status: session.status,
      phase,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_seconds: session.duration_seconds ?? null,
      ani: session.ani ?? null,
      caller_label: callerLabel,
    },
    // Knowledge Bin is not assembled server-side in 7A; Phase 7B may add
    // a server resolver. Emit an empty, contract-shaped placeholder.
    knowledge_bin: { captured_at: new Date().toISOString(), groups: [] },
    events: eventList,
    outcome: {
      disposition_id: outcome?.outcome_type_id ?? null,
      disposition_label: outcome?.disposition ?? null,
      notes_excerpt: note?.note_text ? String(note.note_text).slice(0, 280) : (outcome?.summary ?? null),
    },
    ai_assist: { used_suggestions: [] },
  };
}

export async function persistSessionSnapshot(
  supabase: any,
  callSessionId: string,
  opts: { source?: string } = {},
): Promise<void> {
  try {
    const snapshot = await buildSessionSnapshot(supabase, callSessionId);
    if (!snapshot) return;
    const session = (snapshot as any).session;
    if (!session?.workspace_id) {
      console.warn("[snapshot] missing workspace_id; skipping", callSessionId);
      return;
    }
    const { error } = await supabase.from("call_session_snapshots").insert({
      call_session_id: callSessionId,
      workspace_id: session.workspace_id,
      campaign_id: session.campaign_id ?? null,
      version: 1,
      source: opts.source ?? "system",
      snapshot,
      metadata: {},
    });
    if (error) console.error("[snapshot] insert failed:", error);
  } catch (e) {
    console.error("[snapshot] persistSessionSnapshot error:", e);
  }
}
