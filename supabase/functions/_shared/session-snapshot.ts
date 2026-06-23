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

  const [{ data: events }, { data: outcome }, { data: note }, { data: assistEvents }] = await Promise.all([
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
    supabase
      .from("call_assist_events")
      .select("created_at,suggestion_id,source_type,source_precedence,action")
      .eq("call_session_id", callSessionId)
      .order("created_at", { ascending: true })
      .limit(200),
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

  // Phase 7B — assist usage trail (labels/provenance only, no bodies).
  const usedSuggestions: Array<Record<string, unknown>> = [];
  for (const r of (assistEvents ?? []) as Array<{
    created_at: string;
    suggestion_id: string | null;
    source_type: string | null;
    source_precedence: number | null;
    action: string | null;
  }>) {
    if (!r.suggestion_id || !r.action) continue;
    usedSuggestions.push({
      ts: r.created_at,
      suggestion_id: r.suggestion_id,
      source_precedence:
        typeof r.source_precedence === "number" && Number.isFinite(r.source_precedence)
          ? r.source_precedence
          : 0,
      source_type: r.source_type ?? "live_session",
      action: r.action,
    });
  }

  // Phase 7B — lite Knowledge Bin slice. Compact: labels/provenance/precedence
  // only, never bodies or transcript-like payloads. Heavy resolution still
  // happens client-side via `useInCallKnowledgeBin`; this server path is the
  // honest minimum that's safe to derive without the full hook stack.
  const kbGroups = await buildServerKnowledgeBinLite(supabase, session);

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
    knowledge_bin: { captured_at: new Date().toISOString(), groups: kbGroups },
    events: eventList,
    outcome: {
      disposition_id: outcome?.outcome_type_id ?? null,
      disposition_label: outcome?.disposition ?? null,
      notes_excerpt: note?.note_text ? String(note.note_text).slice(0, 280) : (outcome?.summary ?? null),
    },
    ai_assist: { used_suggestions: usedSuggestions },
  };
}

/**
 * Phase 7B — server-side compact Knowledge Bin builder.
 *
 * Emits the subset of groups we can safely derive from server data:
 *   - caller (from session.ani / caller_name)
 *   - approved (bb_facts, label-only, no payloads)
 *   - dispositions (call_outcome_types for the org, label-only)
 *
 * Other groups (instructions, required, guide, references) require the
 * client-side resolver chain and are intentionally omitted server-side so
 * the snapshot never fabricates them.
 */
async function buildServerKnowledgeBinLite(
  supabase: any,
  session: Record<string, any>,
): Promise<Array<Record<string, unknown>>> {
  const groups: Array<Record<string, unknown>> = [];

  if (session.ani || session.caller_name) {
    groups.push({
      key: "caller",
      precedence: 1,
      items: [
        {
          id: `caller:${session.id}`,
          source_type: "live_session",
          source_id: null,
          label: session.caller_name || session.ani || "Caller",
          body: "",
          scope: "Live session",
          approval_state: "n/a",
          topic_key: "caller_identity",
        },
      ],
    });
  }

  // Approved BB facts — labels only.
  if (session.workspace_id) {
    try {
      const { data: facts } = await supabase
        .from("bb_facts")
        .select("id,display_name,entity_type,verification_state,client_id")
        .eq("workspace_id", session.workspace_id)
        .eq("verification_state", "approved")
        .order("last_reviewed_at", { ascending: false })
        .limit(40);
      if (facts && facts.length > 0) {
        groups.push({
          key: "approved",
          precedence: 4,
          items: (facts as Array<{ id: string; display_name: string | null; entity_type: string | null }>).map((f) => ({
            id: f.id,
            source_type: "business_brain",
            source_id: f.id,
            label: f.display_name || f.entity_type || "Approved fact",
            body: "",
            scope: "Approved",
            approval_state: "approved",
            topic_key: `bb_${f.id}`,
          })),
        });
      }
    } catch (_) {
      /* ignore — snapshot is best-effort */
    }
  }

  // Dispositions — org-scoped types as routing sidecar.
  if (session.organization_id) {
    try {
      const { data: dispos } = await supabase
        .from("call_outcome_types")
        .select("id,name,category")
        .eq("organization_id", session.organization_id)
        .limit(50);
      if (dispos && dispos.length > 0) {
        groups.push({
          key: "dispositions",
          precedence: Number.MAX_SAFE_INTEGER,
          items: (dispos as Array<{ id: string; name: string | null; category: string | null }>).map((d) => ({
            id: d.id,
            source_type: "routing",
            source_id: d.id,
            label: d.name || "Disposition",
            body: "",
            scope: d.category || "Routing",
            approval_state: "n/a",
            topic_key: `disp_${d.id}`,
          })),
        });
      }
    } catch (_) {
      /* ignore */
    }
  }

  return groups;
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
