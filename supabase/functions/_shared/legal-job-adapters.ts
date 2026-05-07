// Phase 3 — Slice 2
// Provider-agnostic adapter contract for legal CRM jobs (Clio Manage, MyCase,
// Clio Grow). Wraps the existing executors with a uniform input/output shape
// keyed off the outcome engine's action types.
//
// This module intentionally REUSES the executor functions inside
// legal-connect-jobs/index.ts. Phase 3 Slice 2 keeps existing executor
// behavior 1:1; the adapter only standardizes input shape, failure
// classification, and retryability decisions so the worker, dashboard, and
// Dev Guide all speak the same language.
//
// Future phases can move executor bodies in here and delete the legacy paths.

export type AdapterAction =
  | "create_intake"
  | "log_client_note"
  | "create_followup_task"
  | "update_contact_or_matter";

export type AdapterFailureKind =
  | "auth"
  | "validation"
  | "rate_limited"
  | "upstream_4xx"
  | "upstream_5xx"
  | "network"
  | "timeout"
  | "unsupported"
  | "unknown";

export interface AdapterContext {
  organization_id: string;
  client_id: string;
  correlation_id?: string | null;
  caller_type?: string | null;
  call_reason?: string | null;
  /** Provider-level connection id (legal_connect_connections). */
  connection_id?: string | null;
}

export interface AdapterInput {
  provider: "clio_manage" | "mycase" | "clio_grow";
  action: AdapterAction;
  /** Normalized fields: contact info, matter ref, note text, task fields. */
  payload: Record<string, unknown>;
  context: AdapterContext;
}

export interface AdapterSuccess {
  status: "success";
  output: Record<string, unknown>;
}

export interface AdapterFailure {
  status: "failure";
  kind: AdapterFailureKind;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type AdapterResult = AdapterSuccess | AdapterFailure;

/**
 * Map an OutcomeAction.type to the (provider, job_type) the existing worker
 * understands. Mirrors `outcome-engine.ts#actionToJobType` so the dashboard
 * and tests can reason about either layer.
 */
export function actionToJobType(
  action: AdapterAction,
  provider: AdapterInput["provider"],
): string {
  switch (action) {
    case "create_intake":
      return provider === "clio_grow" ? "lead.create" : "matter.create";
    case "log_client_note":
      return "note.create";
    case "create_followup_task":
      return "task.create";
    case "update_contact_or_matter":
      return "contact.update";
  }
}

const RATE_LIMITED = /rate.?limit|429/i;
const TIMEOUT = /timeout|etimedout/i;
const NETWORK = /econnreset|econnrefused|network|fetch failed/i;
const AUTH = /unauthor|401|403|token/i;
const VALIDATION = /validation|invalid|missing|400/i;
const UNSUPPORTED = /unsupported|not supported|501/i;
const UPSTREAM_5XX = /\b5\d\d\b|server error|bad gateway|gateway timeout/i;

export function classifyAdapterError(error: string): {
  kind: AdapterFailureKind;
  retryable: boolean;
} {
  const msg = error || "";
  if (UNSUPPORTED.test(msg)) return { kind: "unsupported", retryable: false };
  if (RATE_LIMITED.test(msg)) return { kind: "rate_limited", retryable: true };
  if (TIMEOUT.test(msg)) return { kind: "timeout", retryable: true };
  if (NETWORK.test(msg)) return { kind: "network", retryable: true };
  if (AUTH.test(msg)) return { kind: "auth", retryable: true };
  if (VALIDATION.test(msg)) return { kind: "validation", retryable: false };
  if (UPSTREAM_5XX.test(msg)) return { kind: "upstream_5xx", retryable: true };
  if (/\b4\d\d\b/.test(msg)) return { kind: "upstream_4xx", retryable: false };
  return { kind: "unknown", retryable: true };
}

/**
 * Wrap an executor invocation in the adapter contract. Producers of
 * AdapterResult pass the executor's `{status, output}` on success or throw on
 * failure; this helper translates the throw into a structured AdapterFailure.
 */
export async function runAdapter(
  exec: () => Promise<{ status: string; output: any }>,
): Promise<AdapterResult> {
  try {
    const out = await exec();
    return { status: "success", output: out.output ?? {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const { kind, retryable } = classifyAdapterError(message);
    return { status: "failure", kind, message, retryable };
  }
}
