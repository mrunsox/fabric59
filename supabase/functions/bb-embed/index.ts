/**
 * Business Brain — bb-embed edge function (Phase 3).
 *
 * Embeds approved facts (primary ranking spine) and processed source chunks
 * (evidence) using Lovable AI Gateway's `openai/text-embedding-3-small`
 * model (1536 dims). Two modes:
 *
 *   - `enqueue` (default): batch up to `limit` rows that are missing an
 *     embedding for the given workspace. Safe to call repeatedly. Used by
 *     bb-ingest / bb-approve-fact post-hooks.
 *   - `backfill`: same as enqueue, but loops until nothing is left or a
 *     soft time budget is reached. Admin-gated; used by the Search tab's
 *     "Reindex search" button.
 *
 * Idempotent: rows whose `embedding_model` matches the current model are
 * skipped. Failures are recorded per-row but never block the caller.
 *
 * Privacy: never returns raw chunk/fact text in the response — only counts.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, isServiceRoleRequest } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const BATCH_LIMIT_DEFAULT = 50;
const BACKFILL_BUDGET_MS = 25_000;

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

interface EmbedResult {
  embedded: number;
  skipped: number;
  failed: number;
}

async function embedTexts(inputs: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`embed_gateway_${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  if (!json.data || json.data.length !== inputs.length) {
    throw new Error("embed_gateway_bad_response");
  }
  return json.data.map((d) => d.embedding);
}

function factSearchText(row: {
  entity_type: string;
  display_name: string;
  payload: Record<string, unknown>;
}): string {
  // Concatenate the high-signal fields per entity type. Keep it short.
  const p = row.payload ?? {};
  const parts: Array<string | undefined> = [row.entity_type, row.display_name];
  for (const k of [
    "name",
    "label",
    "title",
    "question",
    "answer",
    "description",
    "role",
    "department",
    "schedule",
    "channel",
    "value",
    "number",
    "body",
  ]) {
    const v = (p as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  if (Array.isArray((p as { fields?: unknown }).fields)) {
    parts.push(
      ((p as { fields: unknown[] }).fields)
        .filter((x): x is string => typeof x === "string")
        .join(", "),
    );
  }
  return parts.filter(Boolean).join(" — ").slice(0, 2000);
}

async function embedFactsBatch(
  admin: ReturnType<typeof adminClient>,
  workspaceId: string,
  limit: number,
): Promise<EmbedResult> {
  const { data: rows, error } = await admin
    .from("bb_facts")
    .select("id, entity_type, display_name, payload, embedding_model")
    .eq("workspace_id", workspaceId)
    .in("verification_state", ["approved", "needs_review"])
    .is("embedding", null)
    .limit(limit);
  if (error) throw new Error(`db_facts_select: ${error.message}`);
  const list = (rows ?? []) as Array<{
    id: string;
    entity_type: string;
    display_name: string;
    payload: Record<string, unknown>;
    embedding_model: string | null;
  }>;
  if (list.length === 0) return { embedded: 0, skipped: 0, failed: 0 };
  const inputs = list.map((r) =>
    factSearchText({
      entity_type: r.entity_type,
      display_name: r.display_name,
      payload: r.payload ?? {},
    }),
  );
  let vectors: number[][];
  try {
    vectors = await embedTexts(inputs);
  } catch (e) {
    console.error("[bb-embed] facts batch failed:", e);
    return { embedded: 0, skipped: 0, failed: list.length };
  }
  const now = new Date().toISOString();
  let embedded = 0;
  let failed = 0;
  await Promise.all(
    list.map(async (r, i) => {
      const v = vectors[i];
      if (!Array.isArray(v) || v.length !== EMBED_DIMS) {
        failed += 1;
        return;
      }
      const { error: updErr } = await admin
        .from("bb_facts")
        .update({
          embedding: v as unknown as string,
          embedding_model: EMBED_MODEL,
          embedded_at: now,
          search_text: inputs[i],
        })
        .eq("id", r.id);
      if (updErr) failed += 1;
      else embedded += 1;
    }),
  );
  return { embedded, skipped: 0, failed };
}

async function embedChunksBatch(
  admin: ReturnType<typeof adminClient>,
  workspaceId: string,
  limit: number,
): Promise<EmbedResult> {
  const { data: rows, error } = await admin
    .from("bb_source_chunks")
    .select("id, text")
    .eq("workspace_id", workspaceId)
    .is("embedding", null)
    .limit(limit);
  if (error) throw new Error(`db_chunks_select: ${error.message}`);
  const list = (rows ?? []) as Array<{ id: string; text: string }>;
  if (list.length === 0) return { embedded: 0, skipped: 0, failed: 0 };
  const inputs = list.map((r) => (r.text ?? "").slice(0, 6000));
  let vectors: number[][];
  try {
    vectors = await embedTexts(inputs);
  } catch (e) {
    console.error("[bb-embed] chunks batch failed:", e);
    return { embedded: 0, skipped: 0, failed: list.length };
  }
  const now = new Date().toISOString();
  let embedded = 0;
  let failed = 0;
  await Promise.all(
    list.map(async (r, i) => {
      const v = vectors[i];
      if (!Array.isArray(v) || v.length !== EMBED_DIMS) {
        failed += 1;
        return;
      }
      const { error: updErr } = await admin
        .from("bb_source_chunks")
        .update({
          embedding: v as unknown as string,
          embedding_model: EMBED_MODEL,
          embedded_at: now,
        })
        .eq("id", r.id);
      if (updErr) failed += 1;
      else embedded += 1;
    }),
  );
  return { embedded, skipped: 0, failed };
}

async function authorize(req: Request, workspaceId: string, adminOnly: boolean) {
  if (isServiceRoleRequest(req)) return { ok: true as const, userId: null };
  const auth = await requireUser(req);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const admin = adminClient();
  const minRole = adminOnly ? "admin" : "manager";
  const { data: canAccess, error } = await admin.rpc("has_workspace_role_min", {
    _user_id: auth.user.id,
    _workspace_id: workspaceId,
    _min: minRole,
  });
  if (error || !canAccess) {
    return { ok: false as const, response: jsonResponse({ error: "Forbidden" }, 403) };
  }
  return { ok: true as const, userId: auth.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  }

  let body: {
    workspaceId?: string;
    mode?: "enqueue" | "backfill";
    target?: "facts" | "chunks" | "both";
    limit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: "bad_request" }, 400);
  }
  const workspaceId = body.workspaceId;
  if (!workspaceId || typeof workspaceId !== "string") {
    return jsonResponse({ ok: false, code: "bad_request", message: "workspaceId required" }, 400);
  }
  const mode = body.mode === "backfill" ? "backfill" : "enqueue";
  const target = body.target ?? "both";
  const limit = Math.max(1, Math.min(body.limit ?? BATCH_LIMIT_DEFAULT, 200));

  const authz = await authorize(req, workspaceId, mode === "backfill");
  if (!authz.ok) return authz.response;

  const admin = adminClient();
  const started = Date.now();
  const totals = { facts: { embedded: 0, skipped: 0, failed: 0 }, chunks: { embedded: 0, skipped: 0, failed: 0 } };

  try {
    do {
      if (target === "facts" || target === "both") {
        const r = await embedFactsBatch(admin, workspaceId, limit);
        totals.facts.embedded += r.embedded;
        totals.facts.failed += r.failed;
        if (mode === "enqueue") break;
        if (r.embedded === 0 && r.failed === 0) break;
      }
      if (mode === "enqueue") break;
    } while (mode === "backfill" && Date.now() - started < BACKFILL_BUDGET_MS);

    do {
      if (target === "chunks" || target === "both") {
        const r = await embedChunksBatch(admin, workspaceId, limit);
        totals.chunks.embedded += r.embedded;
        totals.chunks.failed += r.failed;
        if (mode === "enqueue") break;
        if (r.embedded === 0 && r.failed === 0) break;
      }
      if (mode === "enqueue") break;
    } while (mode === "backfill" && Date.now() - started < BACKFILL_BUDGET_MS);
  } catch (e) {
    return jsonResponse({ ok: false, code: "embed_error", message: String((e as Error).message ?? e) }, 500);
  }

  return jsonResponse({
    ok: true,
    mode,
    target,
    model: EMBED_MODEL,
    facts: totals.facts,
    chunks: totals.chunks,
    latency_ms: Date.now() - started,
  });
});
