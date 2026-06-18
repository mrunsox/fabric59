// Business Brain Phase 5 — Maintain facts (staleness sweep).
// Reads bb_fact_entity_defaults + bb_fact_usage and updates bb_facts.stale_state
// and bb_facts.stale_reasons. Conflict reasons set by bb-detect-conflicts are
// preserved here; we never clear 'stale_due_to_conflict' from this job.
//
// Triggered via cron or manual POST { workspaceId? }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Reason = "stale_due_to_age" | "stale_due_to_usage" | "stale_due_to_conflict";

// Display priority — single-valued stale_state picks the most severe reason.
const REASON_PRIORITY: Reason[] = [
  "stale_due_to_conflict",
  "stale_due_to_usage",
  "stale_due_to_age",
];

function pickPrimaryState(reasons: string[]): string {
  if (reasons.length === 0) return "fresh";
  for (const r of REASON_PRIORITY) if (reasons.includes(r)) return r;
  return "fresh";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const workspaceId: string | undefined = body.workspaceId;

    const { data: defaults } = await supabase
      .from("bb_fact_entity_defaults")
      .select("entity_type,default_review_interval_days");
    const intervalByEntity = new Map<string, number>();
    for (const d of defaults ?? []) {
      intervalByEntity.set(d.entity_type as string, d.default_review_interval_days as number);
    }

    let factsQuery = supabase
      .from("bb_facts")
      .select(
        "id,workspace_id,entity_type,verification_state,last_reviewed_at,expected_review_interval_days,stale_reasons,stale_state",
      )
      .eq("verification_state", "approved")
      .limit(5000);
    if (workspaceId) factsQuery = factsQuery.eq("workspace_id", workspaceId);
    const { data: facts, error: factErr } = await factsQuery;
    if (factErr) throw factErr;

    const factIds = (facts ?? []).map((f) => f.id as string);
    const usageMap = new Map<string, { last_used_at: string | null; usage_score: number }>();
    if (factIds.length) {
      const { data: usage } = await supabase
        .from("bb_fact_usage")
        .select("fact_id,last_used_at,usage_score")
        .in("fact_id", factIds);
      for (const u of usage ?? []) {
        usageMap.set(u.fact_id as string, {
          last_used_at: (u.last_used_at as string | null) ?? null,
          usage_score: Number(u.usage_score ?? 0),
        });
      }
    }

    // Compute high-usage threshold per workspace: 75th percentile usage_score.
    const scoresByWorkspace = new Map<string, number[]>();
    for (const f of facts ?? []) {
      const u = usageMap.get(f.id as string);
      if (!u || u.usage_score <= 0) continue;
      const arr = scoresByWorkspace.get(f.workspace_id as string) ?? [];
      arr.push(u.usage_score);
      scoresByWorkspace.set(f.workspace_id as string, arr);
    }
    const thresholdByWorkspace = new Map<string, number>();
    for (const [ws, arr] of scoresByWorkspace) {
      arr.sort((a, b) => a - b);
      const p75 = arr[Math.floor(arr.length * 0.75)] ?? 0;
      thresholdByWorkspace.set(ws, Math.max(1, p75));
    }

    const now = Date.now();
    let updates = 0;
    const batches: Array<{ id: string; stale_state: string; stale_reasons: string[]; last_used_at: string | null }> = [];

    for (const f of facts ?? []) {
      const interval =
        (f.expected_review_interval_days as number | null) ??
        intervalByEntity.get(f.entity_type as string) ??
        120;
      const ageMs = now - new Date(f.last_reviewed_at as string).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const usage = usageMap.get(f.id as string);
      const threshold = thresholdByWorkspace.get(f.workspace_id as string) ?? Infinity;

      const prevReasons = new Set<string>((f.stale_reasons as string[] | null) ?? []);
      // Preserve conflict reasons (only bb-detect-conflicts / explicit resolve clear them).
      const nextReasons = new Set<string>();
      if (prevReasons.has("stale_due_to_conflict")) nextReasons.add("stale_due_to_conflict");

      if (ageDays > interval) nextReasons.add("stale_due_to_age");
      if (usage && usage.usage_score >= threshold && ageDays > interval) {
        nextReasons.add("stale_due_to_usage");
      }

      const reasonsArr = Array.from(nextReasons).sort();
      const nextState = pickPrimaryState(reasonsArr);
      const prevArr = Array.from(prevReasons).sort();
      const lastUsed = usage?.last_used_at ?? null;

      if (
        nextState !== (f.stale_state as string) ||
        JSON.stringify(reasonsArr) !== JSON.stringify(prevArr) ||
        lastUsed
      ) {
        batches.push({
          id: f.id as string,
          stale_state: nextState,
          stale_reasons: reasonsArr,
          last_used_at: lastUsed,
        });
      }
    }

    // Apply in chunks to avoid oversized requests.
    for (let i = 0; i < batches.length; i += 200) {
      const chunk = batches.slice(i, i + 200);
      for (const row of chunk) {
        const upd: Record<string, unknown> = {
          stale_state: row.stale_state,
          stale_reasons: row.stale_reasons,
        };
        if (row.last_used_at) upd.last_used_at = row.last_used_at;
        const { error } = await supabase.from("bb_facts").update(upd).eq("id", row.id);
        if (!error) updates += 1;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: facts?.length ?? 0, updates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
