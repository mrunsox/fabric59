import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Flow runner.
 *
 * Modes:
 *   1. Test:     { flow_id, test: true, payload }
 *      → Runs filters + mappings + (HTTP) action against payload, no row written.
 *
 *   2. Execute:  { deployment_id, payload, source_event_id?, source_event_type?, idempotency_key? }
 *      → Persists a deployment_runs row with request/response, idempotency key,
 *        external_record_id (if returned), and capped retries with backoff+jitter.
 *
 *   3. Retry:    { retry_of: <run_id> }
 *      → Loads original run, replays with the SAME idempotency_key so connectors
 *        with idempotency support can dedupe. Sets retry_of.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // ───── TEST MODE ─────────────────────────────────────────────────────────
    if (body.test === true && body.flow_id) {
      const { data: flow } = await supabase.from("flows").select("*").eq("id", body.flow_id).maybeSingle();
      if (!flow) return json({ error: "Flow not found" }, 404);
      const def = flow.definition ?? {};
      const result = await executeDefinition(def, body.payload ?? {}, { test: true });
      return json({ test: true, ...result });
    }

    // ───── RETRY MODE ────────────────────────────────────────────────────────
    let deployment_id: string | undefined = body.deployment_id;
    let payload: Record<string, unknown> = body.payload ?? {};
    let trigger_event_id: string | null = body.trigger_event_id ?? null;
    let source_event_id: string | null = body.source_event_id ?? null;
    let source_event_type: string | null = body.source_event_type ?? null;
    let idempotency_key: string | null = body.idempotency_key ?? null;
    const retry_of: string | null = body.retry_of ?? null;

    if (retry_of) {
      const { data: orig } = await supabase.from("deployment_runs").select("*").eq("id", retry_of).maybeSingle();
      if (!orig) return json({ error: "Original run not found" }, 404);
      deployment_id = orig.deployment_id;
      payload = (orig.request_payload ?? orig.payload ?? {}) as Record<string, unknown>;
      trigger_event_id = orig.trigger_event_id;
      source_event_id = orig.source_event_id;
      source_event_type = orig.source_event_type;
      idempotency_key = orig.idempotency_key; // reuse key for dedupe
    }

    if (!deployment_id) return json({ error: "deployment_id or retry_of required" }, 400);

    const { data: deployment } = await supabase
      .from("deployments").select("*, flows(*)").eq("id", deployment_id).maybeSingle();
    if (!deployment) return json({ error: "Deployment not found" }, 404);

    if (deployment.status !== "active" && !retry_of) {
      return json({ skipped: true, reason: `deployment status=${deployment.status}` });
    }

    // Compute idempotency key if caller didn't supply
    if (!idempotency_key) {
      const seed = `${deployment_id}:${source_event_id ?? trigger_event_id ?? crypto.randomUUID()}`;
      idempotency_key = await sha256(seed);
    }

    // Insert running row
    const { data: run, error: runErr } = await supabase.from("deployment_runs").insert({
      deployment_id,
      organization_id: deployment.organization_id,
      trigger_event_id,
      source_event_id,
      source_event_type,
      idempotency_key,
      retry_of,
      status: "running",
      request_payload: payload,
      payload, // keep legacy column populated
    }).select().single();
    if (runErr || !run) return json({ error: runErr?.message ?? "run insert failed" }, 500);

    const flow = deployment.flows;
    const def = flow?.definition ?? {};
    const failure = (def.failure ?? {}) as { retries?: number; backoff_ms?: number };
    const maxRetries = Math.max(0, Math.min(10, failure.retries ?? 0));
    const backoff = failure.backoff_ms ?? 1000;

    let lastErr: string | null = null;
    let response: Record<string, unknown> | null = null;
    let externalRecordId: string | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await executeDefinition(def, payload, { test: false, idempotency_key });
        if (result.skipped) {
          await supabase.from("deployment_runs").update({
            status: "skipped",
            finished_at: new Date().toISOString(),
            error: result.reason ?? null,
            response_payload: result as unknown as Record<string, unknown>,
          }).eq("id", run.id);
          return json({ success: true, run_id: run.id, status: "skipped", ...result });
        }
        response = result as unknown as Record<string, unknown>;
        externalRecordId = (result.action_result?.external_record_id as string | undefined) ?? null;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = (e as Error).message;
        const retriable = isRetriable(e);
        if (!retriable || attempt === maxRetries) break;
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff * Math.pow(2, attempt) + jitter);
      }
    }

    const status = lastErr ? "failed" : "succeeded";
    await supabase.from("deployment_runs").update({
      status,
      finished_at: new Date().toISOString(),
      error: lastErr,
      response_payload: response,
      external_record_id: externalRecordId,
    }).eq("id", run.id);

    return json({ success: !lastErr, run_id: run.id, status, error: lastErr, response });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

// ─── Definition execution (filters → mappings → action) ───────────────────────

interface ExecResult {
  mapped?: Record<string, unknown>;
  action_result?: Record<string, unknown> | null;
  skipped?: boolean;
  reason?: string;
}

async function executeDefinition(
  def: Record<string, unknown>,
  payload: Record<string, unknown>,
  ctx: { test: boolean; idempotency_key?: string | null }
): Promise<ExecResult> {
  const filters = (def.filters ?? []) as Array<{ field: string; op: string; value: unknown }>;
  for (const f of filters) {
    const actual = getPath(payload, f.field);
    if (!matches(actual, f.op, f.value)) {
      return { skipped: true, reason: `filter failed: ${f.field}` };
    }
  }
  const mappings = (def.mappings ?? []) as Array<{ source: string; target: string }>;
  const mapped: Record<string, unknown> = {};
  for (const m of mappings) setPath(mapped, m.target, getPath(payload, m.source));

  const action = (def.action ?? null) as
    | { connector: string; action: string; config: Record<string, unknown> }
    | null;
  let action_result: Record<string, unknown> | null = null;
  if (action) action_result = await dispatchAction(action, mapped, ctx);
  return { mapped, action_result };
}

async function dispatchAction(
  action: { connector: string; action: string; config: Record<string, unknown> },
  mapped: Record<string, unknown>,
  ctx: { test: boolean; idempotency_key?: string | null }
): Promise<Record<string, unknown>> {
  const cfg = action.config ?? {};
  // Real HTTP dispatch for webhook / custom-http
  if (action.connector === "webhook" || action.connector === "custom-http") {
    const url = (cfg.url as string) || "";
    if (!url) {
      if (ctx.test) return { stub: true, reason: "no URL configured", body: mapped };
      throw new Error("Action URL not configured");
    }
    const method = (cfg.method as string) || "POST";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(cfg.headers as Record<string, string> ?? {}),
    };
    if (ctx.idempotency_key) headers["Idempotency-Key"] = ctx.idempotency_key;
    const body = method === "GET" ? undefined : JSON.stringify(mapped);
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    return { status: res.status, body: parsed };
  }

  // CRM connector actions are stubbed — they return a fake external_record_id
  // so the run pipeline is end-to-end. Real adapters can replace this.
  return {
    stub: true,
    connector: action.connector,
    action: action.action,
    idempotency_key: ctx.idempotency_key,
    external_record_id: ctx.test ? null : `${action.connector}_${crypto.randomUUID().slice(0, 8)}`,
    sent: mapped,
  };
}

function isRetriable(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  if (status === undefined) return true; // network/timeout
  if (status >= 500) return true;
  if (status === 408 || status === 429) return true;
  return false;
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function matches(actual: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "in": {
      const arr = Array.isArray(expected) ? expected
        : typeof expected === "string" ? expected.split(",").map((s) => s.trim())
        : [];
      return arr.includes(actual as never);
    }
    case "contains": return typeof actual === "string" && typeof expected === "string" && actual.includes(expected);
    case "exists": return actual !== undefined && actual !== null;
    default: return true;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
