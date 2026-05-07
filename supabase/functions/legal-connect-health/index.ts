// Phase 5 Slice 3 — Legal Connect tenant health & alert evaluator.
//
// GET  /  → returns per-tenant rollups for design-partner tenants in caller's org.
// POST /  with { action: "evaluate" } → re-runs alert rules for design-partner
//        tenants and inserts/refreshes rows in legal_connect_alerts.
// POST /  with { action: "ack", alert_id } → mark alert acknowledged.
// POST /  with { action: "resolve", alert_id } → mark resolved.
//
// Stays internal-only and respects RLS via the caller's JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TenantRow {
  id: string;
  name: string;
  organization_id: string;
  is_design_partner: boolean | null;
  legal_connect_rollout_status: string | null;
  legal_connect_readiness_state: string | null;
  max_jobs_per_minute: number | null;
  max_jobs_per_hour: number | null;
}

interface JobRow {
  id: string;
  client_id: string;
  status: string;
  failure_classification: string | null;
  failure_reason: string | null;
  created_at: string;
  succeeded_at: string | null;
  failed_at: string | null;
  input_payload: any;
  correlation_id: string | null;
}

interface TenantHealth {
  client_id: string;
  client_name: string;
  rollout_status: string;
  readiness_state: string;
  limits: { max_jobs_per_minute: number; max_jobs_per_hour: number };
  jobs_24h: number;
  jobs_7d: number;
  succeeded_24h: number;
  failed_24h: number;
  rate_limited_24h: number;
  test_24h: number;
  success_rate_24h: number | null;
  top_error_class: { kind: string; count: number } | null;
  open_alerts: number;
  last_job_at: string | null;
}

function isTest(j: JobRow): boolean {
  const ip = j.input_payload as any;
  return !!(ip?.__test__ || ip?.test_run || (j.correlation_id ?? "").startsWith("test_"));
}

function classOf(j: JobRow): string | null {
  const c = j.failure_classification;
  if (!c) return null;
  return c.startsWith("adapter:") ? c.slice(8) : c;
}

async function buildHealth(supabase: any, orgId: string): Promise<TenantHealth[]> {
  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, name, organization_id, is_design_partner, legal_connect_rollout_status, legal_connect_readiness_state, max_jobs_per_minute, max_jobs_per_hour",
    )
    .eq("organization_id", orgId)
    .eq("is_design_partner", true);

  const tenantList = (tenants ?? []) as TenantRow[];
  if (tenantList.length === 0) return [];

  const ids = tenantList.map((t) => t.id);
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: jobs } = await supabase
    .from("legal_connect_sync_jobs")
    .select(
      "id, client_id, status, failure_classification, failure_reason, created_at, succeeded_at, failed_at, input_payload, correlation_id",
    )
    .in("client_id", ids)
    .gte("created_at", since7d)
    .order("created_at", { ascending: false });

  const { data: alerts } = await supabase
    .from("legal_connect_alerts")
    .select("id, client_id, status")
    .in("client_id", ids)
    .eq("status", "open");

  const openAlertCount = new Map<string, number>();
  for (const a of (alerts ?? []) as any[]) {
    openAlertCount.set(a.client_id, (openAlertCount.get(a.client_id) ?? 0) + 1);
  }

  const cutoff24h = Date.now() - 86_400_000;
  const out: TenantHealth[] = [];

  for (const t of tenantList) {
    const all = ((jobs ?? []) as JobRow[]).filter((j) => j.client_id === t.id);
    const recent24 = all.filter((j) => new Date(j.created_at).getTime() >= cutoff24h);
    const succeeded24 = recent24.filter((j) => j.status === "succeeded").length;
    const failed24 = recent24.filter((j) => j.status === "failed" || j.status === "dead_letter").length;
    const rateLimited24 = recent24.filter((j) => classOf(j) === "rate_limited").length;
    const test24 = recent24.filter(isTest).length;
    const errorCounts = new Map<string, number>();
    for (const j of recent24) {
      if (j.status === "failed" || j.status === "dead_letter") {
        const k = classOf(j) ?? "unknown";
        errorCounts.set(k, (errorCounts.get(k) ?? 0) + 1);
      }
    }
    let topErr: { kind: string; count: number } | null = null;
    for (const [k, v] of errorCounts) if (!topErr || v > topErr.count) topErr = { kind: k, count: v };
    const total24 = succeeded24 + failed24;
    out.push({
      client_id: t.id,
      client_name: t.name,
      rollout_status: t.legal_connect_rollout_status ?? "not_started",
      readiness_state: t.legal_connect_readiness_state ?? "draft",
      limits: {
        max_jobs_per_minute: t.max_jobs_per_minute ?? 60,
        max_jobs_per_hour: t.max_jobs_per_hour ?? 1000,
      },
      jobs_24h: recent24.length,
      jobs_7d: all.length,
      succeeded_24h: succeeded24,
      failed_24h: failed24,
      rate_limited_24h: rateLimited24,
      test_24h: test24,
      success_rate_24h: total24 === 0 ? null : Math.round((succeeded24 / total24) * 100),
      top_error_class: topErr,
      open_alerts: openAlertCount.get(t.id) ?? 0,
      last_job_at: all[0]?.created_at ?? null,
    });
  }
  return out;
}

async function evaluateAlerts(supabase: any, orgId: string): Promise<{ created: number }> {
  const health = await buildHealth(supabase, orgId);
  let created = 0;
  for (const h of health) {
    const live = h.rollout_status === "live_pilot" || h.rollout_status === "ready_for_live" || h.rollout_status === "live_steady";
    const triggers: Array<{ kind: string; severity: "warning" | "critical"; title: string; details: any }> = [];

    if (live && h.success_rate_24h !== null && h.success_rate_24h < 70 && h.failed_24h >= 3) {
      triggers.push({
        kind: "high_failure_rate",
        severity: "critical",
        title: `Sustained failures (${h.success_rate_24h}% success)`,
        details: { failed_24h: h.failed_24h, succeeded_24h: h.succeeded_24h },
      });
    }
    if (live && h.top_error_class?.kind === "auth" && h.top_error_class.count >= 1) {
      triggers.push({
        kind: "auth_failure",
        severity: "critical",
        title: "Auth failures detected",
        details: { count: h.top_error_class.count },
      });
    }
    if (h.rate_limited_24h >= 1) {
      triggers.push({
        kind: "rate_limited",
        severity: "warning",
        title: `Rate-limited ${h.rate_limited_24h}× in 24h`,
        details: { count: h.rate_limited_24h, limits: h.limits },
      });
    }
    if (live && h.jobs_24h === 0) {
      triggers.push({
        kind: "zero_jobs",
        severity: "warning",
        title: "No jobs in 24h despite live status",
        details: { rollout_status: h.rollout_status },
      });
    }

    for (const trig of triggers) {
      // Dedup: only insert if no open alert of same kind for this client.
      const { data: existing } = await supabase
        .from("legal_connect_alerts")
        .select("id")
        .eq("client_id", h.client_id)
        .eq("alert_kind", trig.kind)
        .eq("status", "open")
        .limit(1);
      if ((existing ?? []).length > 0) continue;
      await supabase.from("legal_connect_alerts").insert({
        organization_id: orgId,
        client_id: h.client_id,
        alert_kind: trig.kind,
        severity: trig.severity,
        title: trig.title,
        details: trig.details,
        status: "open",
      });
      created++;
    }
  }
  return { created };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organization_id");
    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const health = await buildHealth(supabase, orgId);
      const { data: alerts } = await supabase
        .from("legal_connect_alerts")
        .select("id, client_id, alert_kind, severity, title, details, status, created_at")
        .eq("organization_id", orgId)
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(100);
      return new Response(JSON.stringify({ health, alerts: alerts ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.action === "evaluate") {
        const r = await evaluateAlerts(supabase, orgId);
        return new Response(JSON.stringify(r), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (body.action === "ack" && body.alert_id) {
        await supabase
          .from("legal_connect_alerts")
          .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
          .eq("id", body.alert_id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (body.action === "resolve" && body.alert_id) {
        await supabase
          .from("legal_connect_alerts")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", body.alert_id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
