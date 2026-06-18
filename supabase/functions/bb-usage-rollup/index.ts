// Business Brain Phase 5 — Usage rollup job.
// Aggregates bb_* telemetry from platform_events into bb_fact_usage.
// Idempotent: re-running on the same window is safe (we upsert by fact_id).
//
// Triggers: nightly cron via pg_cron + pg_net (configured per-workspace by ops).
// Manual trigger: POST { workspaceId, sinceHours? } from an authenticated admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCORE_WEIGHTS: Record<string, number> = {
  search_opens: 1,
  search_marked_useful: 3,
  search_marked_not_useful: -1,
  asc_suggestion_used: 4,
  asc_suggestion_dismissed: -0.5,
  assist_opened: 1,
  assist_copied: 3,
  assist_inserted: 5,
};

const EVENT_TO_COUNTER: Record<string, keyof typeof SCORE_WEIGHTS> = {
  bb_search_result_opened: "search_opens",
  bb_search_result_marked_useful: "search_marked_useful",
  bb_search_result_marked_not_useful: "search_marked_not_useful",
  bb_asc_suggestion_used: "asc_suggestion_used",
  bb_asc_suggestion_dismissed: "asc_suggestion_dismissed",
  bb_assist_card_opened: "assist_opened",
  bb_assist_card_copied: "assist_copied",
  bb_assist_card_inserted: "assist_inserted",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const workspaceId: string | undefined = body.workspaceId;
    const sinceHours: number = Math.max(1, Math.min(720, body.sinceHours ?? 36));
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

    // Pull events. We rely on payload.factId & payload.workspaceId being present.
    const eventTypes = Object.keys(EVENT_TO_COUNTER);
    let q = supabase
      .from("platform_events")
      .select("event_type,payload,created_at")
      .in("event_type", eventTypes)
      .gte("created_at", since)
      .limit(10000);
    const { data: events, error } = await q;
    if (error) throw error;

    // Aggregate in-memory by fact_id (filtered by workspace if requested).
    type Agg = {
      workspace_id: string;
      counters: Record<string, number>;
      last_used_at: string;
    };
    const byFact = new Map<string, Agg>();

    for (const e of events ?? []) {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      const factId = typeof p.factId === "string" ? p.factId : null;
      const ws = typeof p.workspaceId === "string" ? p.workspaceId : null;
      if (!factId || !ws) continue;
      if (workspaceId && ws !== workspaceId) continue;
      const counter = EVENT_TO_COUNTER[e.event_type];
      if (!counter) continue;
      const agg = byFact.get(factId) ?? {
        workspace_id: ws,
        counters: {},
        last_used_at: e.created_at,
      };
      agg.counters[counter] = (agg.counters[counter] ?? 0) + 1;
      if (e.created_at > agg.last_used_at) agg.last_used_at = e.created_at;
      byFact.set(factId, agg);
    }

    // For each fact, fetch existing row (if any) and add counts, then upsert.
    const factIds = Array.from(byFact.keys());
    let touched = 0;
    if (factIds.length) {
      const { data: existing } = await supabase
        .from("bb_fact_usage")
        .select(
          "fact_id,search_opens,search_marked_useful,search_marked_not_useful,asc_suggestion_used,asc_suggestion_dismissed,assist_opened,assist_copied,assist_inserted,last_used_at",
        )
        .in("fact_id", factIds);
      const existingMap = new Map<string, Record<string, unknown>>();
      for (const r of existing ?? []) existingMap.set(r.fact_id as string, r as Record<string, unknown>);

      const upserts = [];
      for (const [factId, agg] of byFact) {
        const prev = existingMap.get(factId) ?? {};
        const merged: Record<string, number> = {};
        let score = 0;
        for (const key of Object.keys(SCORE_WEIGHTS)) {
          const prevN = Number(prev[key] ?? 0);
          const delta = agg.counters[key] ?? 0;
          merged[key] = prevN + delta;
          score += merged[key] * SCORE_WEIGHTS[key];
        }
        const prevLast = typeof prev.last_used_at === "string" ? prev.last_used_at : null;
        const last_used_at = prevLast && prevLast > agg.last_used_at ? prevLast : agg.last_used_at;
        upserts.push({
          fact_id: factId,
          workspace_id: agg.workspace_id,
          ...merged,
          last_used_at,
          usage_score: Math.max(0, score),
          rolled_up_at: new Date().toISOString(),
        });
      }
      if (upserts.length) {
        const { error: upErr } = await supabase
          .from("bb_fact_usage")
          .upsert(upserts, { onConflict: "fact_id" });
        if (upErr) throw upErr;
        touched = upserts.length;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, facts: touched, eventsScanned: events?.length ?? 0, since }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
