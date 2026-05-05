// Build a shareable "Run Report" for a deployment run, including the full
// retry chain (ancestors via retry_of, descendants via runs that point to it),
// idempotency key, request/response payloads, error classification, and
// deployment metadata.

import { supabase } from "@/integrations/supabase/client";
import { classifyError } from "./retry-classification";

export interface RunReportRow {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
  retry_class: string | null;
  retry_reason: string | null;
  http_status: number | null;
  deployment_id: string;
  source_event_type: string | null;
  source_event_id: string | null;
  external_record_id: string | null;
  idempotency_key: string | null;
  retry_of: string | null;
  is_root: boolean;
  request_payload: unknown;
  response_payload: unknown;
}

export interface RunReport {
  generated_at: string;
  root_run_id: string;
  focus_run_id: string;
  idempotency_key: string | null;
  deployment_id: string;
  total_runs: number;
  attempts: number;
  succeeded: number;
  failed: number;
  retry_chain: RunReportRow[];
}

interface RawRun {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  deployment_id: string;
  source_event_type: string | null;
  source_event_id: string | null;
  external_record_id: string | null;
  idempotency_key: string | null;
  retry_of: string | null;
  request_payload: unknown;
  response_payload: unknown;
  payload: unknown;
}

function toRow(r: RawRun, rootId: string): RunReportRow {
  const verdict = r.error ? classifyError(r.error) : null;
  const duration =
    r.finished_at && r.started_at
      ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
      : null;
  return {
    id: r.id,
    status: r.status,
    started_at: r.started_at,
    finished_at: r.finished_at,
    duration_ms: duration,
    error: r.error,
    retry_class: verdict?.cls ?? null,
    retry_reason: verdict?.reason ?? null,
    http_status: verdict?.status ?? null,
    deployment_id: r.deployment_id,
    source_event_type: r.source_event_type,
    source_event_id: r.source_event_id,
    external_record_id: r.external_record_id,
    idempotency_key: r.idempotency_key,
    retry_of: r.retry_of,
    is_root: r.id === rootId,
    request_payload: r.request_payload ?? r.payload,
    response_payload: r.response_payload,
  };
}

export async function fetchRunReport(focusRunId: string): Promise<RunReport> {
  // Walk back to the root via retry_of.
  let cursor = focusRunId;
  const seen = new Set<string>();
  const ancestors: RawRun[] = [];
  // Cap walk to avoid pathological loops.
  for (let i = 0; i < 50; i++) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const { data } = await supabase
      .from("deployment_runs")
      .select("*")
      .eq("id", cursor)
      .maybeSingle();
    if (!data) break;
    ancestors.unshift(data as RawRun);
    if (!data.retry_of) break;
    cursor = data.retry_of as string;
  }

  if (ancestors.length === 0) {
    throw new Error("Run not found");
  }

  const root = ancestors[0];

  // Find descendants: any run sharing this idempotency_key OR transitively via retry_of.
  // Idempotency key is the most reliable correlator since flow-runner reuses it on retries.
  const descendants: RawRun[] = [];
  if (root.idempotency_key) {
    const { data } = await supabase
      .from("deployment_runs")
      .select("*")
      .eq("idempotency_key", root.idempotency_key)
      .order("started_at", { ascending: true });
    if (data) {
      for (const d of data as RawRun[]) {
        if (!ancestors.some((a) => a.id === d.id)) descendants.push(d);
      }
    }
  } else {
    // Fallback: walk forward via retry_of chains rooted at focus run.
    const { data } = await supabase
      .from("deployment_runs")
      .select("*")
      .eq("retry_of", focusRunId)
      .order("started_at", { ascending: true });
    if (data) descendants.push(...(data as RawRun[]));
  }

  const all = [...ancestors, ...descendants].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  const rows = all.map((r) => toRow(r, root.id));

  return {
    generated_at: new Date().toISOString(),
    root_run_id: root.id,
    focus_run_id: focusRunId,
    idempotency_key: root.idempotency_key,
    deployment_id: root.deployment_id,
    total_runs: rows.length,
    attempts: rows.length,
    succeeded: rows.filter((r) => r.status === "succeeded").length,
    failed: rows.filter((r) => r.status === "failed").length,
    retry_chain: rows,
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function reportToCsv(report: RunReport): string {
  const cols: (keyof RunReportRow)[] = [
    "id",
    "is_root",
    "status",
    "started_at",
    "finished_at",
    "duration_ms",
    "retry_class",
    "http_status",
    "retry_reason",
    "error",
    "deployment_id",
    "source_event_type",
    "source_event_id",
    "external_record_id",
    "idempotency_key",
    "retry_of",
    "request_payload",
    "response_payload",
  ];
  const header = cols.join(",");
  const lines = report.retry_chain.map((r) =>
    cols.map((c) => escapeCsv(r[c])).join(",")
  );
  // Prepend a metadata comment line so spreadsheet users see the focus run.
  const meta = `# Fabric59 Run Report · generated ${report.generated_at} · focus ${report.focus_run_id} · idem ${report.idempotency_key ?? "(none)"} · ${report.total_runs} run(s)`;
  return [meta, header, ...lines].join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
