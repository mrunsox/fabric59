// Business Brain Phase 5 — Conflict detection.
// Scans approved facts for:
//   - phone_mismatch  (same canonical_key, different normalized number)
//   - destination_mismatch (same canonical_key, different destination value)
//   - hours_overlap   (same canonical_key, different schedule strings)
//   - faq_duplicate   (cosine similarity >= 0.88 over existing embeddings, different answer)
//   - policy_duplicate(cosine similarity >= 0.92, different body)
//
// Conservative thresholds; we expect to tune from observed FP/FN.
// Idempotent: respects unique open-conflict index on (workspace, pair, kind).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAQ_THRESHOLD = 0.88;
const POLICY_THRESHOLD = 0.92;

function normalizePhone(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/[^0-9+]/g, "");
  if (!d) return null;
  return d.startsWith("+") ? d : d.replace(/^1?/, "");
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function parseEmbedding(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }
  return null;
}

type Fact = {
  id: string;
  workspace_id: string;
  entity_type: string;
  canonical_key: string;
  payload: Record<string, unknown>;
  embedding: unknown;
  stale_reasons: string[] | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const workspaceId: string | undefined = body.workspaceId;

    let q = supabase
      .from("bb_facts")
      .select("id,workspace_id,entity_type,canonical_key,payload,embedding,stale_reasons")
      .eq("verification_state", "approved")
      .limit(5000);
    if (workspaceId) q = q.eq("workspace_id", workspaceId);
    const { data, error } = await q;
    if (error) throw error;
    const facts = (data ?? []) as Fact[];

    // Group by workspace_id + entity_type + canonical_key for exact-key conflicts.
    const groups = new Map<string, Fact[]>();
    for (const f of facts) {
      const k = `${f.workspace_id}|${f.entity_type}|${f.canonical_key}`;
      const arr = groups.get(k) ?? [];
      arr.push(f);
      groups.set(k, arr);
    }

    const conflicts: Array<{
      workspace_id: string;
      primary_fact_id: string;
      conflicting_fact_id: string;
      conflict_kind: string;
      entity_type: string;
      similarity: number | null;
      details: Record<string, unknown>;
    }> = [];

    for (const arr of groups.values()) {
      if (arr.length < 2) continue;
      const sample = arr[0];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j];
          if (a.entity_type === "phone") {
            const na = normalizePhone(String(a.payload.number ?? ""));
            const nb = normalizePhone(String(b.payload.number ?? ""));
            if (na && nb && na !== nb) {
              conflicts.push({
                workspace_id: a.workspace_id,
                primary_fact_id: a.id, conflicting_fact_id: b.id,
                conflict_kind: "phone_mismatch", entity_type: a.entity_type,
                similarity: null, details: { a: na, b: nb },
              });
            }
          } else if (a.entity_type === "destination_contact") {
            const va = String(a.payload.value ?? "").trim().toLowerCase();
            const vb = String(b.payload.value ?? "").trim().toLowerCase();
            if (va && vb && va !== vb) {
              conflicts.push({
                workspace_id: a.workspace_id,
                primary_fact_id: a.id, conflicting_fact_id: b.id,
                conflict_kind: "destination_mismatch", entity_type: a.entity_type,
                similarity: null, details: {},
              });
            }
          } else if (a.entity_type === "hours") {
            const sa = String(a.payload.schedule ?? "").trim();
            const sb = String(b.payload.schedule ?? "").trim();
            if (sa && sb && sa !== sb) {
              conflicts.push({
                workspace_id: a.workspace_id,
                primary_fact_id: a.id, conflicting_fact_id: b.id,
                conflict_kind: "hours_overlap", entity_type: a.entity_type,
                similarity: null, details: {},
              });
            }
          }
        }
      }
      void sample;
    }

    // FAQ / policy near-duplicates via embeddings, scoped per workspace.
    const byWsType = new Map<string, Fact[]>();
    for (const f of facts) {
      if (f.entity_type !== "faq" && f.entity_type !== "policy") continue;
      if (!f.embedding) continue;
      const k = `${f.workspace_id}|${f.entity_type}`;
      const arr = byWsType.get(k) ?? [];
      arr.push(f);
      byWsType.set(k, arr);
    }
    for (const [k, arr] of byWsType) {
      const [, et] = k.split("|");
      const threshold = et === "policy" ? POLICY_THRESHOLD : FAQ_THRESHOLD;
      for (let i = 0; i < arr.length; i++) {
        const ea = parseEmbedding(arr[i].embedding);
        if (!ea) continue;
        for (let j = i + 1; j < arr.length; j++) {
          const eb = parseEmbedding(arr[j].embedding);
          if (!eb) continue;
          const sim = cosine(ea, eb);
          if (sim < threshold) continue;
          // Different answer/body? (don't flag exact duplicates).
          const ansA = String((arr[i].payload.answer ?? arr[i].payload.body) ?? "").trim();
          const ansB = String((arr[j].payload.answer ?? arr[j].payload.body) ?? "").trim();
          if (!ansA || !ansB || ansA === ansB) continue;
          conflicts.push({
            workspace_id: arr[i].workspace_id,
            primary_fact_id: arr[i].id,
            conflicting_fact_id: arr[j].id,
            conflict_kind: et === "policy" ? "policy_duplicate" : "faq_duplicate",
            entity_type: et,
            similarity: sim,
            details: {},
          });
        }
      }
    }

    let inserted = 0;
    const flaggedFactIds = new Set<string>();
    for (const c of conflicts) {
      flaggedFactIds.add(c.primary_fact_id);
      flaggedFactIds.add(c.conflicting_fact_id);
      const { error: insErr } = await supabase.from("bb_fact_conflicts").insert(c);
      if (!insErr) inserted += 1;
      // Unique index will reject already-open dup; that's expected.
    }

    // Flip stale_state for flagged facts (additive reason).
    for (const factId of flaggedFactIds) {
      const { data: row } = await supabase
        .from("bb_facts")
        .select("stale_reasons")
        .eq("id", factId)
        .maybeSingle();
      const cur = new Set<string>(((row?.stale_reasons as string[] | null) ?? []));
      cur.add("stale_due_to_conflict");
      const reasonsArr = Array.from(cur).sort();
      await supabase
        .from("bb_facts")
        .update({
          stale_reasons: reasonsArr,
          stale_state: "stale_due_to_conflict",
        })
        .eq("id", factId);
    }

    return new Response(
      JSON.stringify({
        ok: true, scanned: facts.length,
        conflictsDetected: conflicts.length, inserted,
        factsFlagged: flaggedFactIds.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
