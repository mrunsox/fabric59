/**
 * Business Brain — bb-search edge function (Phase 3).
 *
 * Read-only semantic + structured retrieval over approved facts and source
 * chunks for a workspace. Approved facts are the primary ranking spine;
 * chunks supply evidence and orphan fallback when no fact covers the query.
 *
 * Default corpus: approved facts only. `includeNeedsReview` is an explicit
 * reviewer/admin opt-in.
 *
 * Privacy: logs only structural metadata to `bb_search_queries` — never
 * raw query text, snippet text, source titles, or fact payloads.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const EMBED_MODEL = "openai/text-embedding-3-small";

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

async function embedQuery(text: string): Promise<number[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`embed_gateway_${res.status}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const v = json.data?.[0]?.embedding;
  if (!v) throw new Error("embed_gateway_bad_response");
  return v;
}

interface FactHit {
  id: string;
  entity_type: string;
  display_name: string;
  payload: Record<string, unknown>;
  confidence_at_review: number | null;
  verification_state: string;
  last_reviewed_at: string;
  source_refs: Array<{ source_id: string; extraction_id: string | null; snippet: string | null }>;
  similarity: number;
}

interface ChunkHit {
  id: string;
  source_id: string;
  source_title: string;
  source_kind: string;
  ordinal: number;
  text: string;
  similarity: number;
}

interface SourceCard {
  kind: "fact" | "chunk";
  id: string;
  entityType: string | null;
  title: string;
  snippet: string | null;
  evidence: Array<{ sourceId: string; sourceTitle: string | null; sourceKind: string | null; snippet: string }>;
  score: number;
  confidence: number | null;
  verificationState: string | null;
  lastReviewedAt: string | null;
  factId: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: {
    workspaceId?: string;
    clientId?: string | null;
    query?: string;
    filters?: {
      entityTypes?: string[];
      sourceKinds?: string[];
      includeNeedsReview?: boolean;
    };
    limit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: "bad_request" }, 400);
  }

  const workspaceId = body.workspaceId;
  const query = (body.query ?? "").toString().trim();
  if (!workspaceId || !query) {
    return jsonResponse({ ok: false, code: "bad_request", message: "workspaceId and query required" }, 400);
  }
  if (query.length > 500) {
    return jsonResponse({ ok: false, code: "bad_request", message: "query too long" }, 400);
  }

  const admin = adminClient();
  const { data: canAccess, error: roleErr } = await admin.rpc("has_workspace_role_min", {
    _user_id: auth.user.id,
    _workspace_id: workspaceId,
    _min: "agent",
  });
  if (roleErr || !canAccess) {
    return jsonResponse({ ok: false, code: "forbidden" }, 403);
  }

  const limit = Math.max(1, Math.min(body.limit ?? 10, 25));
  const entityTypes = Array.isArray(body.filters?.entityTypes) && body.filters!.entityTypes!.length
    ? body.filters!.entityTypes!
    : null;
  const sourceKinds = Array.isArray(body.filters?.sourceKinds) && body.filters!.sourceKinds!.length
    ? body.filters!.sourceKinds!
    : null;
  const includeNeedsReview = body.filters?.includeNeedsReview === true;
  const clientId = body.clientId ?? null;

  const started = Date.now();
  let queryVec: number[];
  try {
    queryVec = await embedQuery(query);
  } catch (e) {
    return jsonResponse(
      { ok: false, code: "embed_error", message: String((e as Error).message ?? e) },
      502,
    );
  }
  const embedAsString = JSON.stringify(queryVec);

  const [factsRes, chunksRes] = await Promise.all([
    admin.rpc("bb_search_facts", {
      _workspace_id: workspaceId,
      _client_id: clientId,
      _query_embedding: embedAsString,
      _entity_types: entityTypes,
      _include_needs_review: includeNeedsReview,
      _limit: limit,
    }),
    admin.rpc("bb_search_chunks", {
      _workspace_id: workspaceId,
      _client_id: clientId,
      _query_embedding: embedAsString,
      _source_kinds: sourceKinds,
      _limit: limit * 2,
    }),
  ]);

  if (factsRes.error) {
    return jsonResponse({ ok: false, code: "search_error", message: factsRes.error.message }, 500);
  }
  if (chunksRes.error) {
    return jsonResponse({ ok: false, code: "search_error", message: chunksRes.error.message }, 500);
  }

  const facts = ((factsRes.data ?? []) as FactHit[]).filter((f) => f.similarity > 0.2);
  const chunks = ((chunksRes.data ?? []) as ChunkHit[]).filter((c) => c.similarity > 0.2);

  // Build fact source-id → chunk evidence map for fact cards.
  const chunkBySource = new Map<string, ChunkHit[]>();
  for (const c of chunks) {
    const arr = chunkBySource.get(c.source_id) ?? [];
    arr.push(c);
    chunkBySource.set(c.source_id, arr);
  }
  const usedChunkIds = new Set<string>();

  const factCards: SourceCard[] = facts.map((f) => {
    const evidence: SourceCard["evidence"] = [];
    for (const ref of f.source_refs ?? []) {
      const relatedChunks = chunkBySource.get(ref.source_id) ?? [];
      const top = relatedChunks[0];
      if (top) usedChunkIds.add(top.id);
      evidence.push({
        sourceId: ref.source_id,
        sourceTitle: top?.source_title ?? null,
        sourceKind: top?.source_kind ?? null,
        snippet: (top?.text ?? ref.snippet ?? "").slice(0, 360),
      });
      if (evidence.length >= 3) break;
    }
    return {
      kind: "fact",
      id: f.id,
      entityType: f.entity_type,
      title: f.display_name,
      snippet: evidence[0]?.snippet ?? null,
      evidence,
      score: f.similarity,
      confidence: f.confidence_at_review,
      verificationState: f.verification_state,
      lastReviewedAt: f.last_reviewed_at,
      factId: f.id,
    };
  });

  // Orphan chunks: only those that don't back any returned fact.
  const orphanCards: SourceCard[] = chunks
    .filter((c) => !usedChunkIds.has(c.id))
    .slice(0, Math.max(0, limit - factCards.length))
    .map((c) => ({
      kind: "chunk",
      id: c.id,
      entityType: null,
      title: c.source_title || "Source snippet",
      snippet: c.text.slice(0, 360),
      evidence: [
        {
          sourceId: c.source_id,
          sourceTitle: c.source_title,
          sourceKind: c.source_kind,
          snippet: c.text.slice(0, 360),
        },
      ],
      score: c.similarity * 0.9, // de-prioritize vs facts
      confidence: null,
      verificationState: null,
      lastReviewedAt: null,
      factId: null,
    }));

  const cards = [...factCards, ...orphanCards].sort((a, b) => b.score - a.score);

  // Group by entity_type (facts first); orphan chunks share an "_evidence" bucket.
  const groups: Record<string, SourceCard[]> = {};
  for (const c of cards) {
    const key = c.kind === "fact" ? c.entityType ?? "_other" : "_evidence";
    (groups[key] ||= []).push(c);
  }

  const latency = Date.now() - started;
  const topEntityTypes = Object.entries(groups)
    .filter(([k]) => !k.startsWith("_"))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([k]) => k);

  // Privacy-safe log
  try {
    await admin.from("bb_search_queries").insert([{
      workspace_id: workspaceId,
      client_id: clientId,
      user_id: auth.user.id,
      query_length: query.length,
      filters: {
        entityTypes: entityTypes ?? null,
        sourceKinds: sourceKinds ?? null,
        includeNeedsReview,
      },
      top_entity_types: topEntityTypes,
      result_count: cards.length,
      fact_count: factCards.length,
      chunk_count: orphanCards.length,
      latency_ms: latency,
    }]);
  } catch {
    /* swallow */
  }

  return jsonResponse({
    ok: true,
    model: EMBED_MODEL,
    latency_ms: latency,
    cards,
    groups,
    counts: { facts: factCards.length, chunks: orphanCards.length, total: cards.length },
  });
});
