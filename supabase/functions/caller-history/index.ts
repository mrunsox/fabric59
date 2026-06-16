// Caller history lookup by ANI.
// Returns prior interactions for a phone number across:
//   1. call_sessions (internal runner sessions, with disposition + notes)
//   2. call_log_cache (Five9 raw call log cache) as a fallback supplement.
//
// Auth: relies on the caller's JWT — RLS already scopes both tables to
// organizations the user belongs to, so we just forward credentials.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface HistoryItem {
  id: string;
  source: "internal" | "five9_cache";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  disposition: string | null;
  agent_name: string | null;
  script_name: string | null;
  summary: string | null;
}

function normalizeAni(raw: string): { full: string; last10: string } {
  const digits = (raw ?? "").replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return { full: digits, last10 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const aniRaw: unknown = body?.ani;
    const limit = Math.min(Math.max(Number(body?.limit ?? 10), 1), 50);

    if (typeof aniRaw !== "string" || aniRaw.trim().length === 0) {
      return new Response(JSON.stringify({ error: "ani is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { last10 } = normalizeAni(aniRaw);
    if (last10.length < 7) {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Internal call_sessions matching the last-10-digit suffix.
    const { data: sessions, error: sErr } = await supabase
      .from("call_sessions")
      .select(
        "id, started_at, ended_at, duration_seconds, ani, script_id, agent_id, metadata, scripts(name), agents(first_name,last_name), call_outcomes(disposition,summary,created_at), call_notes(note_text,created_at)",
      )
      .ilike("ani", `%${last10}`)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (sErr) {
      console.error("[caller-history] sessions query error", sErr);
    }

    const items: HistoryItem[] = (sessions ?? []).map((row: any) => {
      const outcomes = Array.isArray(row.call_outcomes) ? row.call_outcomes : [];
      const lastOutcome = outcomes.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      const notes = Array.isArray(row.call_notes) ? row.call_notes : [];
      const lastNote = notes.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      const agent = row.agents
        ? `${row.agents.first_name ?? ""} ${row.agents.last_name ?? ""}`.trim()
        : null;
      return {
        id: row.id,
        source: "internal",
        started_at: row.started_at,
        ended_at: row.ended_at,
        duration_seconds: row.duration_seconds ?? null,
        disposition: lastOutcome?.disposition ?? null,
        agent_name: agent && agent.length > 0 ? agent : null,
        script_name: row.scripts?.name ?? null,
        summary: lastNote?.note_text
          ? String(lastNote.note_text).slice(0, 240)
          : lastOutcome?.summary
          ? String(lastOutcome.summary).slice(0, 240)
          : null,
      };
    });

    // 2. Supplement with cached Five9 call logs if we have headroom.
    const remaining = limit - items.length;
    if (remaining > 0) {
      const { data: cached, error: cErr } = await supabase
        .from("call_log_cache")
        .select("id, call_timestamp, call_data")
        .order("call_timestamp", { ascending: false })
        .limit(200);

      if (cErr) console.error("[caller-history] cache query error", cErr);

      const cachedItems: HistoryItem[] = (cached ?? [])
        .filter((row: any) => {
          const ani =
            row.call_data?.ani ??
            row.call_data?.ANI ??
            row.call_data?.callerNumber ??
            row.call_data?.from ??
            "";
          return String(ani).replace(/\D/g, "").endsWith(last10);
        })
        .slice(0, remaining)
        .map((row: any) => ({
          id: `cache-${row.id}`,
          source: "five9_cache" as const,
          started_at: row.call_timestamp,
          ended_at: row.call_data?.endTimestamp ?? null,
          duration_seconds:
            Number(row.call_data?.callDuration ?? row.call_data?.duration) || null,
          disposition: row.call_data?.disposition ?? null,
          agent_name: row.call_data?.agentName ?? row.call_data?.agent ?? null,
          script_name: row.call_data?.campaign ?? null,
          summary: null,
        }));

      items.push(...cachedItems);
    }

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[caller-history] unexpected error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
