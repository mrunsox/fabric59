import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ScenarioId = "resolved" | "callback" | "escalation" | "failed";

export interface ScenarioDeviation {
  scenario: ScenarioId;
  total: number;
  deviations: number;
  reasons: { reason: string; count: number }[];
  /** Sample session ids for drill-down (up to 5). */
  sampleSessions: string[];
}

interface SessionRow {
  id: string;
  status: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
}

interface OutcomeRow {
  call_session_id: string;
  disposition: string | null;
  summary: string | null;
}

interface EventRow {
  call_session_id: string;
  event_type: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const SCENARIO_DISPO: Record<ScenarioId, RegExp> = {
  resolved: /resolv|complet|success/i,
  callback: /callback|follow.?up|pending/i,
  escalation: /escalat|transfer|handoff/i,
  failed: /aband|drop|voicemail|vm|no.?answer|fail/i,
};

/**
 * Deviation rules per scenario. Each returns null if no deviation, or a string reason.
 */
function detectDeviations(
  scenario: ScenarioId,
  session: SessionRow,
  outcome: OutcomeRow | undefined,
  events: EventRow[],
): string[] {
  const reasons: string[] = [];
  const eventTypes = new Set(events.map((e) => (e.event_type ?? "").toLowerCase()));
  const dispo = (outcome?.disposition ?? "").toLowerCase();
  const status = (session.status ?? "").toLowerCase();

  // Universal: ended without disposition
  if ((status === "ended" || status === "acw") && !outcome) {
    reasons.push("ended_without_disposition");
  }
  // Universal: disposition committed but no notes/summary
  if (outcome && !outcome.summary) {
    reasons.push("missing_summary_on_commit");
  }

  switch (scenario) {
    case "resolved":
      if (!eventTypes.has("call_connected") && !eventTypes.has("connected")) {
        reasons.push("no_connect_event_for_resolved");
      }
      if (dispo && /callback|escalat|aband/i.test(dispo)) {
        reasons.push("branched_to_non_resolved_outcome");
      }
      break;
    case "callback":
      if (dispo && !/callback|follow|pending/i.test(dispo)) {
        reasons.push("callback_scenario_missing_callback_dispo");
      }
      if (!eventTypes.has("callback_scheduled") && /callback/i.test(dispo)) {
        reasons.push("callback_dispo_without_schedule_event");
      }
      break;
    case "escalation":
      if (!eventTypes.has("escalation_assigned") && !eventTypes.has("transfer")) {
        reasons.push("escalation_without_assignee_or_transfer");
      }
      break;
    case "failed":
      if (status === "connected" && (session.duration_seconds ?? 0) > 30) {
        reasons.push("classified_failed_but_long_connected");
      }
      break;
  }

  return reasons;
}

function classifyScenario(session: SessionRow, outcome: OutcomeRow | undefined): ScenarioId {
  const dispo = (outcome?.disposition ?? "").toLowerCase();
  if (SCENARIO_DISPO.failed.test(dispo)) return "failed";
  if (SCENARIO_DISPO.escalation.test(dispo)) return "escalation";
  if (SCENARIO_DISPO.callback.test(dispo)) return "callback";
  if (SCENARIO_DISPO.resolved.test(dispo)) return "resolved";
  // Heuristic fallback by status
  if ((session.status ?? "").toLowerCase() === "connected" && (session.duration_seconds ?? 0) < 5) {
    return "failed";
  }
  return "resolved";
}

export function useScenarioDeviations(windowHours = 24) {
  const [data, setData] = useState<Record<ScenarioId, ScenarioDeviation>>({
    resolved: { scenario: "resolved", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
    callback: { scenario: "callback", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
    escalation: { scenario: "escalation", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
    failed: { scenario: "failed", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
      const { data: sessions, error: sErr } = await db
        .from("call_sessions")
        .select("id,status,ended_at,duration_seconds,metadata")
        .gte("started_at", since)
        .limit(5000);
      if (sErr) throw sErr;
      const sessionList = (sessions ?? []) as SessionRow[];
      const ids = sessionList.map((s) => s.id);

      let outcomes: OutcomeRow[] = [];
      let events: EventRow[] = [];
      if (ids.length > 0) {
        const [{ data: oData, error: oErr }, { data: eData, error: eErr }] = await Promise.all([
          db.from("call_outcomes").select("call_session_id,disposition,summary").in("call_session_id", ids),
          db.from("call_session_events").select("call_session_id,event_type").in("call_session_id", ids),
        ]);
        if (oErr) throw oErr;
        if (eErr) throw eErr;
        outcomes = (oData ?? []) as OutcomeRow[];
        events = (eData ?? []) as EventRow[];
      }

      const outcomeBySession = new Map<string, OutcomeRow>();
      for (const o of outcomes) outcomeBySession.set(o.call_session_id, o);
      const eventsBySession = new Map<string, EventRow[]>();
      for (const e of events) {
        const arr = eventsBySession.get(e.call_session_id) ?? [];
        arr.push(e);
        eventsBySession.set(e.call_session_id, arr);
      }

      const acc: Record<ScenarioId, ScenarioDeviation> = {
        resolved: { scenario: "resolved", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
        callback: { scenario: "callback", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
        escalation: { scenario: "escalation", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
        failed: { scenario: "failed", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
      };
      const reasonCounts: Record<ScenarioId, Map<string, number>> = {
        resolved: new Map(), callback: new Map(), escalation: new Map(), failed: new Map(),
      };

      for (const s of sessionList) {
        const o = outcomeBySession.get(s.id);
        const evts = eventsBySession.get(s.id) ?? [];
        const scenario = classifyScenario(s, o);
        acc[scenario].total++;
        const reasons = detectDeviations(scenario, s, o, evts);
        if (reasons.length > 0) {
          acc[scenario].deviations++;
          if (acc[scenario].sampleSessions.length < 5) acc[scenario].sampleSessions.push(s.id);
          for (const r of reasons) {
            reasonCounts[scenario].set(r, (reasonCounts[scenario].get(r) ?? 0) + 1);
          }
        }
      }

      for (const k of Object.keys(acc) as ScenarioId[]) {
        acc[k].reasons = Array.from(reasonCounts[k].entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);
      }

      setData(acc);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compute deviations");
    } finally {
      setLoading(false);
    }
  }, [windowHours]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, updatedAt, refresh: load };
}
