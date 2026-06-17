/**
 * Business Brain — bb-ingest edge function.
 *
 * Input: { sourceId, text, kind }
 * Steps:
 *   1. Verify caller is authenticated and is a workspace manager+.
 *   2. Chunk the text (paragraph-based, ~1.5k char target).
 *   3. Call Lovable AI Gateway with a tool-calling extraction prompt.
 *   4. Insert chunks + suggested extractions atomically (service role).
 *   5. Mark the source `processed` / `failed`.
 *
 * Slice 1 keeps the entity_type set small (10 types). URL crawl is NOT
 * supported — callers must paste text inline.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const ENTITY_TYPES = [
  "department",
  "service",
  "staff",
  "phone",
  "hours",
  "destination_contact",
  "faq",
  "escalation_contact",
  "intake_requirement",
  "policy",
] as const;

const SYSTEM_PROMPT = `You are the Business Brain Extractor.

ROLE
Read business source material (uploaded docs, pasted text, FAQs) and produce
a structured list of candidate business knowledge items. Each item must be
grounded in the source — if you cannot point to a snippet, do not extract it.

ENTITY TYPES (use exactly these strings)
- department
- service
- staff
- phone
- hours
- destination_contact   (a callable/emailable destination for a caller need)
- faq                    (question + answer pair)
- escalation_contact    (who to escalate to and when)
- intake_requirement    (information a caller must provide)
- policy                 (firm rule, e.g. "no fee for first consult")

RULES
- One JSON object per candidate item.
- "snippet" is a short verbatim excerpt from the source supporting the item.
- "confidence" is a 0..1 estimate of your certainty.
- Skip greetings, copyright, navigation chrome, and marketing fluff.
- Do not invent phone numbers, emails, hours, or staff names.
- Do not output duplicate items; if a topic appears multiple times, output once.`;

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "emit_extractions",
    description: "Return all grounded business knowledge items found in the source.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_type: { type: "string", enum: ENTITY_TYPES as unknown as string[] },
              payload: { type: "object" },
              snippet: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["entity_type", "payload", "snippet", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

function chunkText(text: string, target = 1500): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if (!buf) {
      buf = p;
      continue;
    }
    if ((buf + "\n\n" + p).length > target) {
      out.push(buf);
      buf = p;
    } else {
      buf += "\n\n" + p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return jsonResponse({ ok: false, code: "upstream_error", message: "AI not configured" }, 500);
  }

  let body: { sourceId?: string; text?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: "bad_request" }, 400);
  }

  const sourceId = body.sourceId;
  const text = (body.text ?? "").toString();
  if (!sourceId || typeof sourceId !== "string") {
    return jsonResponse({ ok: false, code: "bad_request", message: "sourceId required" }, 400);
  }

  const admin = adminClient();

  // Load the source row and verify the caller is a manager+ on its workspace.
  const { data: srcRow, error: srcErr } = await admin
    .from("bb_sources")
    .select("id, workspace_id, status")
    .eq("id", sourceId)
    .maybeSingle();
  if (srcErr || !srcRow) {
    return jsonResponse({ ok: false, code: "not_found" }, 404);
  }
  const { data: canAccess, error: roleErr } = await admin.rpc("has_workspace_role_min", {
    _user_id: auth.user.id,
    _workspace_id: srcRow.workspace_id,
    _min: "manager",
  });
  if (roleErr || !canAccess) {
    return jsonResponse({ ok: false, code: "forbidden" }, 403);
  }

  await admin
    .from("bb_sources")
    .update({ status: "processing", status_message: null })
    .eq("id", sourceId);

  if (!text.trim()) {
    // Non-text source (e.g. binary upload we can't read here). Mark
    // processed with zero extractions so the UI still moves forward.
    await admin
      .from("bb_sources")
      .update({
        status: "processed",
        status_message: "No text content extracted (binary or empty source).",
        processed_at: new Date().toISOString(),
      })
      .eq("id", sourceId);
    return jsonResponse({ ok: true, extracted: 0, note: "empty" });
  }

  const chunks = chunkText(text);
  // Persist chunks for snippet provenance.
  const chunkRows = chunks.map((c, i) => ({
    source_id: sourceId,
    workspace_id: srcRow.workspace_id,
    ordinal: i,
    text: c,
  }));
  const { data: insertedChunks, error: chunkErr } = await admin
    .from("bb_source_chunks")
    .insert(chunkRows)
    .select("id, ordinal");
  if (chunkErr) {
    await admin
      .from("bb_sources")
      .update({ status: "failed", status_message: chunkErr.message })
      .eq("id", sourceId);
    return jsonResponse({ ok: false, code: "db_error", message: chunkErr.message }, 500);
  }

  let totalExtracted = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const chunkText = chunks[i];
    const chunkId = (insertedChunks ?? []).find((r) => r.ordinal === i)?.id ?? null;
    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `SOURCE CHUNK:\n\n${chunkText}` },
          ],
          tools: [EXTRACT_TOOL],
          tool_choice: { type: "function", function: { name: "emit_extractions" } },
        }),
      });
      if (aiRes.status === 429) {
        await admin
          .from("bb_sources")
          .update({ status: "failed", status_message: "AI rate limited" })
          .eq("id", sourceId);
        return jsonResponse({ ok: false, code: "rate_limited" }, 429);
      }
      if (aiRes.status === 402) {
        await admin
          .from("bb_sources")
          .update({ status: "failed", status_message: "AI credits exhausted" })
          .eq("id", sourceId);
        return jsonResponse({ ok: false, code: "credits_exhausted" }, 402);
      }
      if (!aiRes.ok) {
        const t = await aiRes.text().catch(() => "");
        console.error("bb-ingest upstream", aiRes.status, t);
        continue;
      }
      const json = await aiRes.json();
      const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
      const rawArgs = toolCall?.function?.arguments;
      if (typeof rawArgs !== "string") continue;
      let parsed: { items?: unknown[] };
      try {
        parsed = JSON.parse(rawArgs);
      } catch {
        continue;
      }
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const rows: Record<string, unknown>[] = [];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const row = it as Record<string, unknown>;
        const et = row.entity_type;
        if (typeof et !== "string" || !(ENTITY_TYPES as readonly string[]).includes(et)) {
          continue;
        }
        if (!row.payload || typeof row.payload !== "object") continue;
        rows.push({
          workspace_id: srcRow.workspace_id,
          source_id: sourceId,
          chunk_id: chunkId,
          entity_type: et,
          payload: row.payload,
          snippet: typeof row.snippet === "string" ? row.snippet : null,
          confidence: typeof row.confidence === "number" ? row.confidence : 0,
          review_status: "suggested",
          extraction_metadata: { model: "google/gemini-2.5-flash", chunkOrdinal: i },
        });
      }
      if (rows.length > 0) {
        const { error: insErr } = await admin.from("bb_extractions").insert(rows);
        if (insErr) {
          console.error("bb-ingest insert extractions", insErr);
        } else {
          totalExtracted += rows.length;
        }
      }
    } catch (err) {
      console.error("bb-ingest chunk failed", err);
    }
  }

  await admin
    .from("bb_sources")
    .update({
      status: "processed",
      status_message: `Extracted ${totalExtracted} suggestion(s).`,
      processed_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  return jsonResponse({ ok: true, extracted: totalExtracted });
});
