// Phase 7 — Legal Connect operational reporting aggregator.
//
// Pulls a bounded slice of tenants, sync jobs, alerts, and GA-checklist
// state for the caller's org and rolls them up into:
//   - per-tenant health/activity rows
//   - provider/action scorecards
//   - error-class breakdown
//   - rollout / pilot status distribution
//   - recurring-issue summary
//
// Read-only. RLS in the database limits what each caller sees.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportWindow = "24h" | "7d" | "30d";

const WINDOW_MS: Record<ReportWindow, number> = {
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
};

export interface TenantSummary {
  client_id: string;
  client_name: string;
  organization_id: string;
  rollout_status: string;
  pilot_status: string;
  readiness_state: string;
  is_design_partner: boolean;
  total_jobs: number;
  succeeded: number;
  failed: number;
  retried: number;
  rate_limited: number;
  test_jobs: number;
  live_jobs: number;
  success_rate: number | null;
  top_error_class: string | null;
  open_alerts: number;
  last_activity: string | null;
  ga_done: number;
  ga_total: number;
}

export interface ScorecardRow {
  key: string;
  provider: string;
  action: string;
  attempts: number;
  succeeded: number;
  failed: number;
  rate_limited: number;
  success_rate: number | null;
  top_error_class: string | null;
  alert_count: number;
  last_activity: string | null;
}

export interface ErrorClassRow {
  error_class: string;
  count: number;
  affected_tenants: number;
  latest: string | null;
}

export interface AlertRow {
  id: string;
  client_id: string;
  client_name: string;
  alert_kind: string;
  severity: string;
  status: string;
  title: string;
  created_at: string;
}

export interface RecurringIssue {
  key: string;
  issue_type: string;
  scope: string;
  count: number;
  latest: string | null;
  status: string;
}

export interface RolloutBucket {
  status: string;
  count: number;
}

export interface ReportData {
  generated_at: string;
  window: ReportWindow;
  tenants: TenantSummary[];
  scorecards: ScorecardRow[];
  error_classes: ErrorClassRow[];
  alerts: AlertRow[];
  recurring: RecurringIssue[];
  rollout_buckets: RolloutBucket[];
  pilot_buckets: RolloutBucket[];
  totals: {
    tenants: number;
    jobs: number;
    succeeded: number;
    failed: number;
    open_alerts: number;
  };
}

interface JobRow {
  id: string;
  client_id: string;
  provider: string | null;
  job_type: string | null;
  status: string;
  attempt_count: number | null;
  failure_classification: string | null;
  failure_reason: string | null;
  created_at: string;
  succeeded_at: string | null;
  failed_at: string | null;
  input_payload: any;
  correlation_id: string | null;
}

interface AlertDbRow {
  id: string;
  client_id: string;
  organization_id: string;
  alert_kind: string;
  severity: string;
  status: string;
  title: string;
  details: any;
  created_at: string;
}

function classOf(j: Pick<JobRow, "failure_classification">): string | null {
  const c = j.failure_classification;
  if (!c) return null;
  return c.startsWith("adapter:") ? c.slice(8) : c;
}

function isTest(j: JobRow): boolean {
  const ip = j.input_payload as any;
  return !!(ip?.__test__ || ip?.test_run || (j.correlation_id ?? "").startsWith("test_"));
}

const QK = (orgId: string | undefined | null, w: ReportWindow) => ["lc-reports", orgId, w];

export function useLegalConnectReports(orgId: string | undefined | null, window: ReportWindow = "7d") {
  return useQuery<ReportData>({
    queryKey: QK(orgId, window),
    enabled: !!orgId,
    refetchInterval: 120_000,
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_MS[window]).toISOString();

      const [tenantsRes, jobsRes, alertsRes, gaRes] = await Promise.all([
        (supabase as any)
          .from("tenants")
          .select(
            "id, name, organization_id, is_design_partner, legal_connect_rollout_status, legal_connect_pilot_status, legal_connect_readiness_state",
          )
          .eq("organization_id", orgId),
        (supabase as any)
          .from("legal_connect_sync_jobs")
          .select(
            "id, client_id, provider, job_type, status, attempt_count, failure_classification, failure_reason, created_at, succeeded_at, failed_at, input_payload, correlation_id",
          )
          .eq("organization_id", orgId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
        (supabase as any)
          .from("legal_connect_alerts")
          .select("id, client_id, organization_id, alert_kind, severity, status, title, details, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000),
        (supabase as any)
          .from("legal_connect_ga_checklist_state")
          .select("tenant_id, item_id, status")
          .eq("organization_id", orgId),
      ]);

      const tenants = (tenantsRes.data ?? []) as any[];
      const jobs = (jobsRes.data ?? []) as JobRow[];
      const alerts = (alertsRes.data ?? []) as AlertDbRow[];
      const gaRows = (gaRes.data ?? []) as Array<{ tenant_id: string; item_id: string; status: string }>;

      const nameById = new Map<string, string>();
      for (const t of tenants) nameById.set(t.id, t.name ?? "");

      // Open alert counts per tenant.
      const openAlertsByTenant = new Map<string, number>();
      for (const a of alerts) {
        if (a.status === "open" || a.status === "acknowledged") {
          openAlertsByTenant.set(a.client_id, (openAlertsByTenant.get(a.client_id) ?? 0) + 1);
        }
      }

      // GA progress per tenant.
      const gaByTenant = new Map<string, { done: number; total: number }>();
      for (const r of gaRows) {
        const cur = gaByTenant.get(r.tenant_id) ?? { done: 0, total: 0 };
        cur.total += 1;
        if (r.status === "done") cur.done += 1;
        gaByTenant.set(r.tenant_id, cur);
      }

      // Per-tenant rollups.
      const tenantSummaries: TenantSummary[] = tenants.map((t: any) => {
        const tj = jobs.filter((j) => j.client_id === t.id);
        const succeeded = tj.filter((j) => j.status === "succeeded").length;
        const failed = tj.filter((j) => j.status === "failed" || j.status === "dead_letter").length;
        const retried = tj.filter((j) => (j.attempt_count ?? 0) > 1).length;
        const rate_limited = tj.filter((j) => classOf(j) === "rate_limited").length;
        const test_jobs = tj.filter(isTest).length;
        const live_jobs = tj.length - test_jobs;
        const errs = new Map<string, number>();
        for (const j of tj) {
          if (j.status === "failed" || j.status === "dead_letter") {
            const k = classOf(j) ?? "unknown";
            errs.set(k, (errs.get(k) ?? 0) + 1);
          }
        }
        let topErr: string | null = null;
        let topCount = 0;
        for (const [k, v] of errs) if (v > topCount) { topErr = k; topCount = v; }
        const denom = succeeded + failed;
        const ga = gaByTenant.get(t.id);
        return {
          client_id: t.id,
          client_name: t.name ?? "",
          organization_id: t.organization_id,
          rollout_status: t.legal_connect_rollout_status ?? "not_started",
          pilot_status: t.legal_connect_pilot_status ?? "not_ready",
          readiness_state: t.legal_connect_readiness_state ?? "draft",
          is_design_partner: !!t.is_design_partner,
          total_jobs: tj.length,
          succeeded,
          failed,
          retried,
          rate_limited,
          test_jobs,
          live_jobs,
          success_rate: denom === 0 ? null : Math.round((succeeded / denom) * 100),
          top_error_class: topErr,
          open_alerts: openAlertsByTenant.get(t.id) ?? 0,
          last_activity: tj[0]?.created_at ?? null,
          ga_done: ga?.done ?? 0,
          ga_total: ga?.total ?? 0,
        };
      });

      // Provider/action scorecards.
      const scoreMap = new Map<string, ScorecardRow>();
      const alertByTenantKind = new Map<string, number>();
      for (const a of alerts) alertByTenantKind.set(a.client_id, (alertByTenantKind.get(a.client_id) ?? 0) + 1);
      for (const j of jobs) {
        const provider = j.provider ?? "unknown";
        const action = j.job_type ?? "unknown";
        const key = `${provider}::${action}`;
        const row = scoreMap.get(key) ?? {
          key,
          provider,
          action,
          attempts: 0,
          succeeded: 0,
          failed: 0,
          rate_limited: 0,
          success_rate: null,
          top_error_class: null,
          alert_count: 0,
          last_activity: null,
        };
        row.attempts += 1;
        if (j.status === "succeeded") row.succeeded += 1;
        if (j.status === "failed" || j.status === "dead_letter") row.failed += 1;
        if (classOf(j) === "rate_limited") row.rate_limited += 1;
        if (!row.last_activity || j.created_at > row.last_activity) row.last_activity = j.created_at;
        scoreMap.set(key, row);
      }
      // Compute success rate + top error per scorecard.
      for (const [key, row] of scoreMap) {
        const errs = new Map<string, number>();
        for (const j of jobs) {
          if (`${j.provider ?? "unknown"}::${j.job_type ?? "unknown"}` !== key) continue;
          if (j.status === "failed" || j.status === "dead_letter") {
            const k = classOf(j) ?? "unknown";
            errs.set(k, (errs.get(k) ?? 0) + 1);
          }
        }
        let topErr: string | null = null;
        let topCount = 0;
        for (const [k, v] of errs) if (v > topCount) { topErr = k; topCount = v; }
        row.top_error_class = topErr;
        const denom = row.succeeded + row.failed;
        row.success_rate = denom === 0 ? null : Math.round((row.succeeded / denom) * 100);
      }
      const scorecards = Array.from(scoreMap.values()).sort((a, b) => b.attempts - a.attempts);

      // Error classes (across org).
      const errorClassMap = new Map<string, ErrorClassRow>();
      for (const j of jobs) {
        if (j.status !== "failed" && j.status !== "dead_letter") continue;
        const k = classOf(j) ?? "unknown";
        const row = errorClassMap.get(k) ?? { error_class: k, count: 0, affected_tenants: 0, latest: null };
        row.count += 1;
        if (!row.latest || j.created_at > row.latest) row.latest = j.created_at;
        errorClassMap.set(k, row);
      }
      // Affected tenant count per class.
      for (const [k, row] of errorClassMap) {
        const tenantsWithClass = new Set(
          jobs
            .filter((j) => (j.status === "failed" || j.status === "dead_letter") && (classOf(j) ?? "unknown") === k)
            .map((j) => j.client_id),
        );
        row.affected_tenants = tenantsWithClass.size;
      }
      const errorClasses = Array.from(errorClassMap.values()).sort((a, b) => b.count - a.count);

      // Recurring issues — repeated patterns at tenant + class level.
      const recurringMap = new Map<string, RecurringIssue>();
      const tenantClassFails = new Map<string, { count: number; latest: string }>();
      for (const j of jobs) {
        if (j.status !== "failed" && j.status !== "dead_letter") continue;
        const k = classOf(j) ?? "unknown";
        const id = `${j.client_id}::${k}`;
        const cur = tenantClassFails.get(id) ?? { count: 0, latest: j.created_at };
        cur.count += 1;
        if (j.created_at > cur.latest) cur.latest = j.created_at;
        tenantClassFails.set(id, cur);
      }
      for (const [id, v] of tenantClassFails) {
        if (v.count < 3) continue;
        const [clientId, errClass] = id.split("::");
        recurringMap.set(`fail:${id}`, {
          key: `fail:${id}`,
          issue_type: `Repeated ${errClass} failures`,
          scope: nameById.get(clientId) ?? clientId,
          count: v.count,
          latest: v.latest,
          status: "active",
        });
      }
      // Repeated alert kinds per tenant.
      const tenantAlertKind = new Map<string, { count: number; latest: string; status: string }>();
      for (const a of alerts) {
        const id = `${a.client_id}::${a.alert_kind}`;
        const cur = tenantAlertKind.get(id) ?? { count: 0, latest: a.created_at, status: a.status };
        cur.count += 1;
        if (a.created_at > cur.latest) { cur.latest = a.created_at; cur.status = a.status; }
        tenantAlertKind.set(id, cur);
      }
      for (const [id, v] of tenantAlertKind) {
        if (v.count < 2) continue;
        const [clientId, kind] = id.split("::");
        recurringMap.set(`alert:${id}`, {
          key: `alert:${id}`,
          issue_type: `Recurring alert: ${kind}`,
          scope: nameById.get(clientId) ?? clientId,
          count: v.count,
          latest: v.latest,
          status: v.status,
        });
      }
      const recurring = Array.from(recurringMap.values()).sort((a, b) => b.count - a.count);

      // Rollout / pilot buckets.
      const rolloutCounts = new Map<string, number>();
      const pilotCounts = new Map<string, number>();
      for (const t of tenantSummaries) {
        rolloutCounts.set(t.rollout_status, (rolloutCounts.get(t.rollout_status) ?? 0) + 1);
        pilotCounts.set(t.pilot_status, (pilotCounts.get(t.pilot_status) ?? 0) + 1);
      }
      const rollout_buckets = Array.from(rolloutCounts.entries()).map(([status, count]) => ({ status, count }));
      const pilot_buckets = Array.from(pilotCounts.entries()).map(([status, count]) => ({ status, count }));

      const alertRows: AlertRow[] = alerts.map((a) => ({
        id: a.id,
        client_id: a.client_id,
        client_name: nameById.get(a.client_id) ?? a.client_id,
        alert_kind: a.alert_kind,
        severity: a.severity,
        status: a.status,
        title: a.title,
        created_at: a.created_at,
      }));

      return {
        generated_at: new Date().toISOString(),
        window,
        tenants: tenantSummaries.sort((a, b) => b.total_jobs - a.total_jobs),
        scorecards,
        error_classes: errorClasses,
        alerts: alertRows,
        recurring,
        rollout_buckets,
        pilot_buckets,
        totals: {
          tenants: tenantSummaries.length,
          jobs: jobs.length,
          succeeded: tenantSummaries.reduce((s, t) => s + t.succeeded, 0),
          failed: tenantSummaries.reduce((s, t) => s + t.failed, 0),
          open_alerts: alertRows.filter((a) => a.status === "open" || a.status === "acknowledged").length,
        },
      };
    },
  });
}
