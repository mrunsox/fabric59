// Business Brain Phase 7 — bb-gap-cluster
//
// Nightly per-workspace clustering of bb_gap_events into bb_gap_topics.
// Uses the same embedding model as bb-search for consistency. Conservative
// heuristics for entity/vertical hints — they remain nullable review-facing
// hints, not forced classifications. Enforces a 200-topic open cap per
// workspace, pruning lowest-volume/oldest topics into a distinct `pruned`
// status (separate from human `dismissed`).
//
// POST { workspaceId?: string }
//   - If workspaceId omitted, iterates every workspace with un-clustered events.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "openai/text-embedding-3-small";
const SIM_THRESHOLD = 0.85;
const MAX_OPEN_TOPICS = 200;
const LOOKBACK_DAYS = 30;
const BATCH_LIMIT = 500;

interface GapEvent {
  id: string;
  workspace_id: string;
  channel: "search" | "asc" | "assist";
  normalized_query: string;
  raw_query: string;
  context: Record<string, unknown> | null;
  vertical_profile_id: string | null;
}

interface GapTopic {
  id: string;
  workspace_id: string;
  canonical_question: string;
  canonical_question_hash: string;
  entity_type_hint: string | null;
  vertical_requirement_hint: string | null;
  open_event_count: number;
  channels: string[];
  status: string;
  last_seen_at: string;
  embedding?: number[]; // computed, not stored
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function embed(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`embed_${res.status}`);
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  return (json.data ?? []).map((d) => d.embedding);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Conservative, explainable hint derivation. Hints stay nullable and
 * review-facing only — never forced classifications.
 */
function deriveHints(
  events: GapEvent[],
): { entity_type_hint: string | null; vertical_requirement_hint: string | null } {
  let entity: string | null = null;
  let req: string | null = null;
  const qSample = events[0]?.normalized_query ?? "";
  const channels = new Set(events.map((e) => e.channel));

  // NL questions → faq lean
  if (/^(how|what|when|where|why|do you|can i|is there|does)\b/.test(qSample)) {
    entity = "faq";
  }

  for (const e of events) {
    const ctx = (e.context ?? {}) as Record<string, unknown>;
    const reason = typeof ctx.reason === "string" ? ctx.reason : "";
    const stepKind = typeof ctx.stepKind === "string" ? ctx.stepKind : "";

    if (e.channel === "asc" && /escalation|after.?hours|hours/i.test(stepKind + " " + qSample)) {
      entity = entity ?? "escalation_contact";
      req = req ?? "service_has_escalation";
    }
    if (channels.has("assist") && /service|specialty|issue/i.test(qSample)) {
      entity = entity ?? "service";
    }
    if (/hours|open|closed|when.*open/i.test(qSample)) {
      entity = entity ?? "hours";
      req = req ?? "service_has_hours";
    }
    if (/policy|terms|rules/i.test(qSample) || reason === "no_results") {
      entity = entity ?? (channels.has("search") ? "policy" : entity);
    }
  }
  return { entity_type_hint: entity, vertical_requirement_hint: req };
}

async function clusterWorkspace(db: ReturnType<typeof admin>, workspaceId: string) {
  let topicsCreated = 0;
  let topicsUpdated = 0;
  let topicsPruned = 0;
  let eventsAssigned = 0;

  // 1) Fetch un-clustered events from last 30 days.
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: rawEvents, error: evErr } = await db
    .from("bb_gap_events")
    .select("id,workspace_id,channel,normalized_query,raw_query,context,vertical_profile_id")
    .eq("workspace_id", workspaceId)
    .eq("topic_assigned", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (evErr) throw evErr;
  const events = (rawEvents ?? []) as GapEvent[];
  if (events.length === 0) {
    return { topicsCreated, topicsUpdated, topicsPruned, eventsAssigned };
  }

  // 2) Load existing open topics for this workspace + embed their canonical text.
  const { data: openTopics, error: tErr } = await db
    .from("bb_gap_topics")
    .select("id,workspace_id,canonical_question,canonical_question_hash,entity_type_hint,vertical_requirement_hint,open_event_count,channels,status,last_seen_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");
  if (tErr) throw tErr;
  const existing = (openTopics ?? []) as GapTopic[];

  // Embed: existing topic canonical text + new event normalized text.
  const allTexts = [
    ...existing.map((t) => t.canonical_question),
    ...events.map((e) => e.normalized_query),
  ];
  let vectors: number[][] = [];
  if (allTexts.length > 0) {
    vectors = await embed(allTexts);
  }
  const topicVecs = vectors.slice(0, existing.length);
  const eventVecs = vectors.slice(existing.length);
  for (let i = 0; i < existing.length; i++) existing[i].embedding = topicVecs[i];

  // 3) For each event, assign to nearest topic or create new.
  type Bucket = { topic: GapTopic; events: GapEvent[]; isNew: boolean };
  const buckets: Bucket[] = existing.map((t) => ({ topic: t, events: [], isNew: false }));

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const vec = eventVecs[i];
    if (!vec) continue;
    let bestIdx = -1;
    let bestSim = -1;
    for (let j = 0; j < buckets.length; j++) {
      const tv = buckets[j].topic.embedding;
      if (!tv) continue;
      const s = cosine(vec, tv);
      if (s > bestSim) {
        bestSim = s;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0 && bestSim >= SIM_THRESHOLD) {
      buckets[bestIdx].events.push(ev);
    } else {
      // New topic seeded from this event.
      const hash = await sha256Hex(`${workspaceId}::${ev.normalized_query}`);
      const newTopic: GapTopic = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        canonical_question: ev.normalized_query.slice(0, 280),
        canonical_question_hash: hash,
        entity_type_hint: null,
        vertical_requirement_hint: null,
        open_event_count: 0,
        channels: [],
        status: "open",
        last_seen_at: new Date().toISOString(),
        embedding: vec,
      };
      buckets.push({ topic: newTopic, events: [ev], isNew: true });
    }
  }

  // 4) Persist updates / inserts and event→topic links.
  for (const b of buckets) {
    if (b.events.length === 0) continue;
    const channels = Array.from(new Set([...b.topic.channels, ...b.events.map((e) => e.channel)]));
    const lastSeen = b.events
      .map(() => new Date().toISOString())
      .sort()
      .pop()!;
    const hints = b.isNew ? deriveHints(b.events) : {
      entity_type_hint: b.topic.entity_type_hint,
      vertical_requirement_hint: b.topic.vertical_requirement_hint,
    };

    if (b.isNew) {
      const { error: insErr } = await db.from("bb_gap_topics").insert({
        id: b.topic.id,
        workspace_id: b.topic.workspace_id,
        canonical_question: b.topic.canonical_question,
        canonical_question_hash: b.topic.canonical_question_hash,
        entity_type_hint: hints.entity_type_hint,
        vertical_requirement_hint: hints.vertical_requirement_hint,
        open_event_count: b.events.length,
        channels,
        status: "open",
        last_seen_at: lastSeen,
      });
      if (insErr) continue;
      topicsCreated += 1;
    } else {
      const { error: updErr } = await db
        .from("bb_gap_topics")
        .update({
          open_event_count: b.topic.open_event_count + b.events.length,
          channels,
          last_seen_at: lastSeen,
        })
        .eq("id", b.topic.id);
      if (updErr) continue;
      topicsUpdated += 1;
    }

    // Link rows + mark events assigned.
    const linkRows = b.events.map((e) => ({
      gap_event_id: e.id,
      gap_topic_id: b.topic.id,
      workspace_id: workspaceId,
      similarity_score: null as number | null,
    }));
    await db.from("bb_gap_event_topics").upsert(linkRows, { ignoreDuplicates: true });
    await db
      .from("bb_gap_events")
      .update({ topic_assigned: true })
      .in("id", b.events.map((e) => e.id));
    eventsAssigned += b.events.length;
  }

  // 5) Enforce open-topic cap per workspace.
  const { count: openCount } = await db
    .from("bb_gap_topics")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "open");
  if ((openCount ?? 0) > MAX_OPEN_TOPICS) {
    const overflow = (openCount ?? 0) - MAX_OPEN_TOPICS;
    const { data: toPrune } = await db
      .from("bb_gap_topics")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .order("open_event_count", { ascending: true })
      .order("last_seen_at", { ascending: true })
      .limit(overflow);
    const ids = ((toPrune ?? []) as Array<{ id: string }>).map((r) => r.id);
    if (ids.length) {
      await db
        .from("bb_gap_topics")
        .update({ status: "pruned", status_reason: "overflow_cap_200" })
        .in("id", ids);
      topicsPruned += ids.length;
    }
  }

  return { topicsCreated, topicsUpdated, topicsPruned, eventsAssigned };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const db = admin();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const onlyWorkspace: string | undefined = body?.workspaceId;

    let workspaces: string[];
    if (onlyWorkspace) {
      workspaces = [onlyWorkspace];
    } else {
      const { data } = await db
        .from("bb_gap_events")
        .select("workspace_id")
        .eq("topic_assigned", false)
        .limit(2000);
      workspaces = Array.from(
        new Set(((data ?? []) as Array<{ workspace_id: string }>).map((r) => r.workspace_id)),
      );
    }

    let totalCreated = 0, totalUpdated = 0, totalPruned = 0, totalAssigned = 0;
    for (const ws of workspaces) {
      try {
        const r = await clusterWorkspace(db, ws);
        totalCreated += r.topicsCreated;
        totalUpdated += r.topicsUpdated;
        totalPruned += r.topicsPruned;
        totalAssigned += r.eventsAssigned;
      } catch (e) {
        console.error("[bb-gap-cluster] workspace failed", ws, e);
      }
    }

    // Telemetry: one platform_events row per invocation.
    try {
      const firstWs = workspaces[0];
      if (firstWs) {
        const { data: ws } = await db
          .from("workspaces")
          .select("organization_id")
          .eq("id", firstWs)
          .maybeSingle();
        if (ws?.organization_id) {
          await db.from("platform_events").insert({
            organization_id: ws.organization_id,
            event_type: "bb_gap_cluster_run",
            source: "business-brain",
            payload: {
              workspaceId: onlyWorkspace ?? null,
              workspacesEvaluated: workspaces.length,
              topicsCreated: totalCreated,
              topicsUpdated: totalUpdated,
              topicsPruned: totalPruned,
              eventsAssigned: totalAssigned,
            },
          });
        }
      }
    } catch {
      /* swallow */
    }

    return new Response(
      JSON.stringify({
        ok: true,
        workspaces: workspaces.length,
        topicsCreated: totalCreated,
        topicsUpdated: totalUpdated,
        topicsPruned: totalPruned,
        eventsAssigned: totalAssigned,
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
