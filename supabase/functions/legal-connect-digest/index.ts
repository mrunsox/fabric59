// Phase 8 — Legal Connect operational digest.
//
// GET  /?organization_id=...&window=7d
//   Returns a digest summary (current window + previous-window deltas) for
//   preview in the UI. Read-only.
//
// POST /?organization_id=...
//   Body: { action: "send", cadence?: "weekly" | "daily", cohort?: string,
//           dry_run?: boolean }
//   Builds the same summary, looks up enabled subscribers in
//   legal_connect_digest_subscriptions matching the cohort/cadence, and
//   records a row in legal_connect_digest_runs. Email send is a stub the
//   UI surfaces as "recorded" — actual delivery can be wired to
//   send-transactional-email later without changing this contract.
//
// All access is bound to the caller's JWT/RLS via the anon-key client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WINDOW_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };

interface JobRow {
  id: string;
  client_id: string;
  provider: string | null;
  job_type: string | null;
  status: string;
  attempt_count: number | null;
  failure_classification: string | null;
  created_at: string;
  input_payload: any;
  correlation_id: string | null;
}

function classOf(c: string | null): string | null {
  if (!c) return null;
  return c.startsWith("adapter:") ? c.slice(8) : c;
}

interface WindowAgg {
  total: number;
  succeeded: number;
  failed: number;
  rate_limited: number;
  open_alerts: number;
  recurring: number;
  by_tenant: Map<string, { name: string; failed: number; total: number }>;
  by_action: Map<string, { provider: string; action: string; failed: number; total: number }>;
}

function emptyAgg(): WindowAgg {
  return {
    total: 0,
    succeeded: 0,
    failed: 0,
    rate_limited: 0,
    open_alerts: 0,
    recurring: 0,
    by_tenant: new Map(),
    by_action: new Map(),
  };
}

function delta(curr: number, prev: number) {
  const diff = curr - prev;
  const pct = prev === 0 ? (curr === 0 ? 0 : 100) : Math.round(((curr - prev) / prev) * 100);
  return { current: curr, previous: prev, delta: diff, pct };
}

async function buildDigest(
  supabase: any,
  orgId: string,
  windowKey: "7d" | "24h" | "30d" = "7d",
) {
  const days = WINDOW_DAYS[windowKey] ?? 7;
  const now = Date.now();
  const currStart = new Date(now - days * 86_400_000);
  const prevStart = new Date(now - 2 * days * 86_400_000);

  const [tenantsRes, jobsRes, alertsRes, gaRes, releaseRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, is_design_partner, legal_connect_rollout_status")
      .eq("organization_id", orgId),
    supabase
      .from("legal_connect_sync_jobs")
      .select("id, client_id, provider, job_type, status, attempt_count, failure_classification, created_at, input_payload, correlation_id")
      .eq("organization_id", orgId)
      .gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("legal_connect_alerts")
      .select("id, client_id, alert_kind, severity, status, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", prevStart.toISOString())
      .limit(2000),
    supabase
      .from("legal_connect_ga_checklist_state")
      .select("tenant_id, item_id, status, updated_at")
      .eq("organization_id", orgId),
    supabase
      .from("legal_connect_release_notes")
      .select("id, title, body, audience, published_at")
      .gte("published_at", currStart.toISOString())
      .order("published_at", { ascending: false })
      .limit(10),
  ]);

  const tenants = (tenantsRes.data ?? []) as any[];
  const jobs = (jobsRes.data ?? []) as JobRow[];
  const alerts = (alertsRes.data ?? []) as any[];
  const ga = (gaRes.data ?? []) as any[];
  const releases = (releaseRes.data ?? []) as any[];

  const nameById = new Map<string, string>();
  for (const t of tenants) nameById.set(t.id, t.name ?? "");

  function aggregate(list: JobRow[], windowAlerts: any[]): WindowAgg {
    const a = emptyAgg();
    a.total = list.length;
    a.succeeded = list.filter((j) => j.status === "succeeded").length;
    a.failed = list.filter((j) => j.status === "failed" || j.status === "dead_letter").length;
    a.rate_limited = list.filter((j) => classOf(j.failure_classification) === "rate_limited").length;
    for (const j of list) {
      const tname = nameById.get(j.client_id) ?? j.client_id;
      const t = a.by_tenant.get(j.client_id) ?? { name: tname, failed: 0, total: 0 };
      t.total += 1;
      if (j.status === "failed" || j.status === "dead_letter") t.failed += 1;
      a.by_tenant.set(j.client_id, t);
      const provider = j.provider ?? "unknown";
      const action = j.job_type ?? "unknown";
      const k = `${provider}::${action}`;
      const ag = a.by_action.get(k) ?? { provider, action, failed: 0, total: 0 };
      ag.total += 1;
      if (j.status === "failed" || j.status === "dead_letter") ag.failed += 1;
      a.by_action.set(k, ag);
    }
    a.open_alerts = windowAlerts.filter((al) => al.status === "open" || al.status === "acknowledged").length;
    // Recurring: ≥3 failures of same class on same tenant
    const tcKey = new Map<string, number>();
    for (const j of list) {
      if (j.status !== "failed" && j.status !== "dead_letter") continue;
      const k = `${j.client_id}::${classOf(j.failure_classification) ?? "unknown"}`;
      tcKey.set(k, (tcKey.get(k) ?? 0) + 1);
    }
    for (const v of tcKey.values()) if (v >= 3) a.recurring += 1;
    return a;
  }

  const currJobs = jobs.filter((j) => new Date(j.created_at) >= currStart);
  const prevJobs = jobs.filter((j) => {
    const d = new Date(j.created_at);
    return d >= prevStart && d < currStart;
  });
  const currAlerts = alerts.filter((a) => new Date(a.created_at) >= currStart);
  const prevAlerts = alerts.filter((a) => {
    const d = new Date(a.created_at);
    return d >= prevStart && d < currStart;
  });

  const curr = aggregate(currJobs, currAlerts);
  const prev = aggregate(prevJobs, prevAlerts);

  const successRate = (a: WindowAgg) => {
    const denom = a.succeeded + a.failed;
    return denom === 0 ? null : Math.round((a.succeeded / denom) * 100);
  };

  // GA done now vs same point one window ago.
  const gaDoneNow = ga.filter((g) => g.status === "done").length;
  const gaDonePrev = ga.filter((g) => g.status === "done" && new Date(g.updated_at) < currStart).length;

  const topFailingTenants = Array.from(curr.by_tenant.values())
    .filter((t) => t.failed > 0)
    .sort((a, b) => b.failed - a.failed)
    .slice(0, 5);
  const topFailingActions = Array.from(curr.by_action.values())
    .filter((t) => t.failed > 0)
    .sort((a, b) => b.failed - a.failed)
    .slice(0, 5);

  return {
    window: windowKey,
    window_start: currStart.toISOString(),
    window_end: new Date(now).toISOString(),
    previous_window_start: prevStart.toISOString(),
    previous_window_end: currStart.toISOString(),
    deltas: {
      total_jobs: delta(curr.total, prev.total),
      success_rate: { current: successRate(curr), previous: successRate(prev) },
      failed_jobs: delta(curr.failed, prev.failed),
      rate_limited: delta(curr.rate_limited, prev.rate_limited),
      open_alerts: delta(curr.open_alerts, prev.open_alerts),
      recurring_issues: delta(curr.recurring, prev.recurring),
      ga_done: delta(gaDoneNow, gaDonePrev),
    },
    totals: {
      tenants: tenants.length,
      design_partners: tenants.filter((t) => t.is_design_partner).length,
      jobs: curr.total,
      succeeded: curr.succeeded,
      failed: curr.failed,
      open_alerts: curr.open_alerts,
      recurring: curr.recurring,
    },
    top_failing_tenants: topFailingTenants,
    top_failing_actions: topFailingActions,
    release_notes: releases.map((r) => ({ id: r.id, title: r.title, audience: r.audience, published_at: r.published_at })),
  };
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
    const windowKey = (url.searchParams.get("window") ?? "7d") as "24h" | "7d" | "30d";

    if (req.method === "GET") {
      const summary = await buildDigest(supabase, orgId, windowKey);
      return new Response(JSON.stringify(summary), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.action !== "send") {
        return new Response(JSON.stringify({ error: "unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cadence = body.cadence ?? "weekly";
      const cohort = body.cohort ?? "all";
      const summary = await buildDigest(supabase, orgId, cadence === "daily" ? "24h" : "7d");

      const { data: subs } = await supabase
        .from("legal_connect_digest_subscriptions")
        .select("id, recipient_email, cohort, cadence, enabled")
        .eq("organization_id", orgId)
        .eq("enabled", true)
        .eq("cadence", cadence);
      const recipients = (subs ?? []).filter((s: any) => cohort === "all" || s.cohort === cohort || s.cohort === "all");

      let runId: string | null = null;
      if (!body.dry_run) {
        const { data: inserted } = await supabase
          .from("legal_connect_digest_runs")
          .insert({
            organization_id: orgId,
            cohort,
            cadence,
            window_start: summary.window_start,
            window_end: summary.window_end,
            summary,
            recipients_count: recipients.length,
            delivery_status: "recorded",
          })
          .select("id")
          .single();
        runId = inserted?.id ?? null;

        if (recipients.length) {
          const nowIso = new Date().toISOString();
          await supabase
            .from("legal_connect_digest_subscriptions")
            .update({ last_sent_at: nowIso })
            .in("id", recipients.map((r: any) => r.id));
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          run_id: runId,
          recipients_count: recipients.length,
          recipients: recipients.map((r: any) => r.recipient_email),
          summary,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
