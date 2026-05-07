// Phase 8/9 — Legal Connect operational digest.
//
// GET  /?organization_id=...&window=7d
//   Returns a digest summary (current window + previous-window deltas).
//
// POST /?organization_id=...
//   Body:
//     { action: "send",  cadence?, cohort?, dry_run? }
//       Sends to all enabled subscribers matching cadence/cohort. Renders
//       branded HTML, attempts delivery via Resend (alert_email/resend_*
//       app_config), and records a row in legal_connect_digest_runs with
//       delivery_status = "sent" | "recorded" | "failed". Also evaluates
//       digest summary against escalation thresholds and fires sinks.
//
//     { action: "tick" }
//       Cron entry-point. Iterates legal_connect_digest_schedules, finds
//       schedules whose next_run_at is due, dispatches "send" for each,
//       and rolls next_run_at forward. Auth via x-cron-secret header
//       (SUPABASE_SERVICE_ROLE_KEY) so pg_cron can call without a JWT.
//
// All app-user access uses the caller JWT/RLS via anon-key client. Cron
// path uses service-role for cross-org iteration.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { renderDigestHtml } from "../_shared/digest-renderer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    total: 0, succeeded: 0, failed: 0, rate_limited: 0, open_alerts: 0, recurring: 0,
    by_tenant: new Map(), by_action: new Map(),
  };
}

function delta(curr: number, prev: number) {
  const diff = curr - prev;
  const pct = prev === 0 ? (curr === 0 ? 0 : 100) : Math.round(((curr - prev) / prev) * 100);
  return { current: curr, previous: prev, delta: diff, pct };
}

async function buildDigest(supabase: any, orgId: string, windowKey: "7d" | "24h" | "30d" = "7d") {
  const days = WINDOW_DAYS[windowKey] ?? 7;
  const now = Date.now();
  const currStart = new Date(now - days * 86_400_000);
  const prevStart = new Date(now - 2 * days * 86_400_000);

  const [tenantsRes, jobsRes, alertsRes, gaRes, releaseRes] = await Promise.all([
    supabase.from("tenants").select("id, name, is_design_partner, legal_connect_rollout_status").eq("organization_id", orgId),
    supabase.from("legal_connect_sync_jobs")
      .select("id, client_id, provider, job_type, status, attempt_count, failure_classification, created_at, input_payload, correlation_id")
      .eq("organization_id", orgId).gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: false }).limit(10000),
    supabase.from("legal_connect_alerts").select("id, client_id, alert_kind, severity, status, created_at")
      .eq("organization_id", orgId).gte("created_at", prevStart.toISOString()).limit(2000),
    supabase.from("legal_connect_ga_checklist_state").select("tenant_id, item_id, status, updated_at").eq("organization_id", orgId),
    supabase.from("legal_connect_release_notes").select("id, title, body, audience, published_at")
      .gte("published_at", currStart.toISOString()).order("published_at", { ascending: false }).limit(10),
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

  const gaDoneNow = ga.filter((g) => g.status === "done").length;
  const gaDonePrev = ga.filter((g) => g.status === "done" && new Date(g.updated_at) < currStart).length;

  const topFailingTenants = Array.from(curr.by_tenant.values()).filter((t) => t.failed > 0).sort((a, b) => b.failed - a.failed).slice(0, 5);
  const topFailingActions = Array.from(curr.by_action.values()).filter((t) => t.failed > 0).sort((a, b) => b.failed - a.failed).slice(0, 5);

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

async function loadAppConfig(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from("app_config").select("key, value")
    .in("key", ["resend_api_key", "resend_from_email", "alert_email", "brand_name", "brand_color", "app_url"]);
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.key] = r.value;
  return map;
}

async function sendEmailViaResend(cfg: Record<string, string>, to: string[], subject: string, html: string, text: string) {
  if (!cfg.resend_api_key || to.length === 0) {
    return { ok: false, reason: "missing_resend_key_or_recipients" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.resend_api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.resend_from_email || "alerts@fabric59.com",
        to, subject, html, text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `resend_${res.status}:${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

function evaluateEscalation(summary: any): { severity: "warn" | "critical" | null; reasons: string[] } {
  const reasons: string[] = [];
  let severity: "warn" | "critical" | null = null;
  const sr = summary?.deltas?.success_rate?.current;
  if (typeof sr === "number" && sr < 80) {
    reasons.push(`Success rate ${sr}% (below 80%)`);
    severity = sr < 60 ? "critical" : "warn";
  }
  const recurring = summary?.totals?.recurring ?? 0;
  if (recurring >= 3) {
    reasons.push(`${recurring} recurring issue patterns`);
    severity = severity === "critical" ? severity : "warn";
    if (recurring >= 6) severity = "critical";
  }
  const openAlerts = summary?.totals?.open_alerts ?? 0;
  if (openAlerts >= 5) {
    reasons.push(`${openAlerts} open alerts`);
    severity = severity === "critical" ? severity : "warn";
    if (openAlerts >= 15) severity = "critical";
  }
  return { severity, reasons };
}

async function fireEscalations(supabase: any, orgId: string, summary: any) {
  const ev = evaluateEscalation(summary);
  if (!ev.severity) return { fired: 0, severity: null, reasons: [] };
  const { data: sinks } = await supabase
    .from("legal_connect_escalation_sinks")
    .select("*").eq("organization_id", orgId).eq("enabled", true);
  let fired = 0;
  for (const sink of sinks ?? []) {
    if (sink.severity_threshold === "critical" && ev.severity !== "critical") continue;
    const payload = {
      source: "legal-connect-digest",
      severity: ev.severity,
      organization_id: orgId,
      reasons: ev.reasons,
      window: { start: summary.window_start, end: summary.window_end },
      totals: summary.totals,
      deltas: summary.deltas,
      top_failing_tenants: summary.top_failing_tenants,
      top_failing_actions: summary.top_failing_actions,
      ts: new Date().toISOString(),
    };
    let status = "pending";
    let err: string | null = null;
    try {
      if (sink.kind === "slack") {
        const text = `:rotating_light: *Legal Connect ${ev.severity}* — ${ev.reasons.join(" · ")} (${summary.totals.failed} failed / ${summary.totals.jobs} jobs)`;
        const r = await fetch(sink.target, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        status = r.ok ? "sent" : `http_${r.status}`;
        if (!r.ok) err = (await r.text()).slice(0, 300);
      } else {
        const body = JSON.stringify(payload);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sink.hmac_secret) {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey("raw", enc.encode(sink.hmac_secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
          headers["X-Lc-Signature"] = "sha256=" + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        const r = await fetch(sink.target, { method: "POST", headers, body });
        status = r.ok ? "sent" : `http_${r.status}`;
        if (!r.ok) err = (await r.text()).slice(0, 300);
      }
      fired += 1;
    } catch (e) {
      status = "failed";
      err = e instanceof Error ? e.message : String(e);
    }
    await supabase.from("legal_connect_escalation_events").insert({
      organization_id: orgId, sink_id: sink.id,
      trigger_kind: "digest", severity: ev.severity, payload,
      delivery_status: status, delivery_error: err,
    });
    await supabase.from("legal_connect_escalation_sinks").update({ last_fired_at: new Date().toISOString() }).eq("id", sink.id);
  }
  return { fired, severity: ev.severity, reasons: ev.reasons };
}

function nextRunAt(schedule: { cadence: string; hour_utc: number; weekday: number }): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), schedule.hour_utc, 0, 0));
  if (schedule.cadence === "daily") {
    if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  } else {
    // weekly: 0=Sunday..6=Saturday
    const dayDiff = (schedule.weekday - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + dayDiff);
    if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 7);
  }
  return next.toISOString();
}

async function performSend(
  supabase: any, orgId: string, cadence: "weekly" | "daily", cohort: string, dryRun = false,
) {
  const summary = await buildDigest(supabase, orgId, cadence === "daily" ? "24h" : "7d");
  const { data: subs } = await supabase
    .from("legal_connect_digest_subscriptions")
    .select("id, recipient_email, cohort, cadence, enabled")
    .eq("organization_id", orgId).eq("enabled", true).eq("cadence", cadence);
  const recipients = (subs ?? []).filter((s: any) => cohort === "all" || s.cohort === cohort || s.cohort === "all");

  const cfg = await loadAppConfig(supabase);
  const { html, text, subject } = renderDigestHtml({
    brand_name: cfg.brand_name, brand_color: cfg.brand_color,
    cohort, cadence, summary, app_url: cfg.app_url,
  });

  let deliveryStatus = "recorded";
  let deliveryError: string | null = null;
  let sendResult: { ok: boolean; reason?: string } = { ok: false, reason: "dry_run" };

  if (!dryRun && recipients.length > 0) {
    sendResult = await sendEmailViaResend(cfg, recipients.map((r: any) => r.recipient_email), subject, html, text);
    deliveryStatus = sendResult.ok ? "sent" : "failed";
    if (!sendResult.ok) deliveryError = sendResult.reason ?? null;
  } else if (recipients.length === 0) {
    deliveryStatus = "no_recipients";
  }

  let runId: string | null = null;
  if (!dryRun) {
    const { data: inserted } = await supabase.from("legal_connect_digest_runs").insert({
      organization_id: orgId, cohort, cadence,
      window_start: summary.window_start, window_end: summary.window_end,
      summary, recipients_count: recipients.length,
      delivery_status: deliveryStatus, delivery_error: deliveryError, last_html: html,
    }).select("id").single();
    runId = inserted?.id ?? null;

    if (sendResult.ok) {
      await supabase.from("legal_connect_digest_subscriptions").update({ last_sent_at: new Date().toISOString() })
        .in("id", recipients.map((r: any) => r.id));
    }
  }

  const escalation = await fireEscalations(supabase, orgId, summary);

  return { runId, recipients, summary, deliveryStatus, deliveryError, escalation, subject };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  // Always have a service-role client available for cron-only operations
  // (validating the cron secret against app_config and walking schedules
  // across all orgs). User requests use a JWT-bound anon client to keep
  // RLS in force.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let isCron = false;
  if (cronSecret) {
    const { data: row } = await adminClient
      .from("app_config").select("value").eq("key", "legal_connect_cron_secret").maybeSingle();
    isCron = !!row?.value && row.value === cronSecret;
  }

  const supabase = isCron
    ? adminClient
    : createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      });

  try {
    const orgId = url.searchParams.get("organization_id");

    if (req.method === "GET") {
      if (!orgId) {
        return new Response(JSON.stringify({ error: "organization_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const windowKey = (url.searchParams.get("window") ?? "7d") as "24h" | "7d" | "30d";
      const summary = await buildDigest(supabase, orgId, windowKey);
      return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Cron tick: walk schedules across all orgs
      if (body.action === "tick") {
        if (!isCron) {
          return new Response(JSON.stringify({ error: "cron only" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const nowIso = new Date().toISOString();
        const { data: due } = await supabase
          .from("legal_connect_digest_schedules")
          .select("*").eq("enabled", true).lte("next_run_at", nowIso);
        let processed = 0;
        const results: any[] = [];
        for (const sch of due ?? []) {
          try {
            const r = await performSend(supabase, sch.organization_id, sch.cadence, sch.cohort, false);
            await supabase.from("legal_connect_digest_schedules").update({
              last_run_at: nowIso,
              next_run_at: nextRunAt(sch),
            }).eq("id", sch.id);
            processed += 1;
            results.push({ schedule_id: sch.id, run_id: r.runId, status: r.deliveryStatus, escalation: r.escalation });
          } catch (e) {
            results.push({ schedule_id: sch.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return new Response(JSON.stringify({ ok: true, processed, results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (body.action !== "send") {
        return new Response(JSON.stringify({ error: "unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!orgId) {
        return new Response(JSON.stringify({ error: "organization_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cadence = (body.cadence ?? "weekly") as "weekly" | "daily";
      const cohort = body.cohort ?? "all";
      const r = await performSend(supabase, orgId, cadence, cohort, !!body.dry_run);

      return new Response(JSON.stringify({
        ok: true,
        run_id: r.runId,
        recipients_count: r.recipients.length,
        recipients: r.recipients.map((x: any) => x.recipient_email),
        delivery_status: r.deliveryStatus,
        delivery_error: r.deliveryError,
        escalation: r.escalation,
        subject: r.subject,
        summary: r.summary,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
