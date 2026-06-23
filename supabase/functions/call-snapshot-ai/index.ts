/**
 * Phase 7B — call-snapshot-ai
 *
 * Snapshot-only AI helper. Accepts `{ mode, snapshot }` and returns either a
 * short summary + tags or a set of advisory QA hints. The snapshot is the
 * ONLY input — this function never queries the database or fetches live call
 * data. Outputs are deterministic in shape; absent fields are returned as
 * empty strings/arrays rather than thrown errors.
 *
 * Auth: verify_jwt = false (Lovable-managed). Validate inputs explicitly.
 */

import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface RequestBody {
  mode?: "summary" | "qa_hints";
  snapshot?: Record<string, unknown> | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function compactSnapshot(snapshot: Record<string, unknown>): Record<string, unknown> {
  // Strip oversized fields before sending to the model. Snapshot is already
  // compact, but defend against future growth.
  const out: Record<string, unknown> = {};
  for (const key of ["session", "events", "outcome", "ai_assist"]) {
    if (snapshot[key] !== undefined) out[key] = snapshot[key];
  }
  const kb = snapshot.knowledge_bin as
    | { captured_at?: string; groups?: Array<{ key: string; items?: unknown[] }> }
    | undefined;
  if (kb && Array.isArray(kb.groups)) {
    out.knowledge_bin = {
      captured_at: kb.captured_at ?? null,
      groups: kb.groups.map((g) => ({
        key: g.key,
        item_count: Array.isArray(g.items) ? g.items.length : 0,
        labels: Array.isArray(g.items)
          ? g.items
              .slice(0, 10)
              .map((it: any) => (typeof it?.label === "string" ? it.label : ""))
              .filter(Boolean)
          : [],
      })),
    };
  }
  return out;
}

const SUMMARY_SYSTEM = `You generate a short, factual summary of a customer call.
Input is a JSON snapshot of the call. Use ONLY the snapshot — do not invent
facts, names, or outcomes. Keep the summary to 2–4 sentences. Tags must be
short (1–3 words), at most 3, and must come from observable evidence in the
snapshot (e.g. dispositions, event types, knowledge bin group labels).
Always reply with a JSON object: { "summary": string, "tags": string[] }.`;

const QA_SYSTEM = `You generate advisory QA review hints for a reviewer to
consider. Input is a JSON snapshot of the call. Use ONLY the snapshot. Return
2–5 short, neutral bullets a reviewer could verify (e.g. "Check disclosure was
read", "Confirm caller verification"). Do NOT score the call, pass/fail it,
or speculate beyond the snapshot. Always reply with a JSON object:
{ "hints": string[] }.`;

async function callModel(system: string, user: string): Promise<unknown> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("missing LOVABLE_API_KEY");
  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gateway_${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const mode = body.mode;
  const snapshot = body.snapshot;
  if (mode !== "summary" && mode !== "qa_hints") {
    return jsonResponse({ error: "invalid_mode" }, 400);
  }
  if (!snapshot || typeof snapshot !== "object") {
    return jsonResponse({ error: "missing_snapshot" }, 400);
  }

  const compact = compactSnapshot(snapshot);
  const userPayload = JSON.stringify(compact);

  try {
    if (mode === "summary") {
      const data = (await callModel(SUMMARY_SYSTEM, userPayload)) as {
        summary?: unknown;
        tags?: unknown;
      };
      return jsonResponse({
        summary: typeof data.summary === "string" ? data.summary : "",
        tags: Array.isArray(data.tags)
          ? (data.tags as unknown[])
              .map((t) => String(t).trim())
              .filter(Boolean)
              .slice(0, 3)
          : [],
      });
    }
    const data = (await callModel(QA_SYSTEM, userPayload)) as { hints?: unknown };
    return jsonResponse({
      hints: Array.isArray(data.hints)
        ? (data.hints as unknown[])
            .map((h) => String(h).trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "rate_limit") return jsonResponse({ error: "rate_limit" }, 429);
    if (msg === "credits_exhausted") return jsonResponse({ error: "credits_exhausted" }, 402);
    return jsonResponse({ error: "ai_failed", detail: msg }, 500);
  }
});
