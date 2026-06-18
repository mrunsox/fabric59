/**
 * Business Brain — bb-ingest edge function.
 *
 * Three branches:
 *   1. `mode: "structured_directory"` (Slice 2) — caller supplies normalized
 *      `rows[]` from a CSV/team directory. Deterministic extraction, no AI.
 *   2. `kind: "paste_faq"` with `pairs[]` (Slice 2) — caller supplies
 *      pre-parsed Q/A pairs. Deterministic FAQ extraction, no AI. Falls
 *      through to AI on the raw text when no pairs were parsed.
 *   3. Default (Slice 1) — chunk + AI extraction over `text`.
 *
 * Slice 2 entity set is still the 10 Phase 1 types.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { enqueueBbEmbed } from "../_shared/bb-embed-trigger.ts";
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

ANTI-PATTERNS (do NOT emit any of these)
- Page navigation, cookie banners, ToS/privacy chrome, marketing fluff.
- staff without a real personal name.
- policy longer than 2 sentences — split into smaller policies instead.
- phone without a clear label or context hint.
- destination_contact derived from a named staff member's direct line.
- faq where the "answer" is just a link or a single word.

FIELD GUIDANCE
- phone.number: include the number as written, but ensure ≥7 digits.
- hours.schedule: keep the original free-form text verbatim. Do not invent
  a weekly structure; downstream normalization handles that.
- destination_contact.channel: one of "phone" | "email" | "url" | "sms".
- faq.service: only set when the FAQ explicitly names a reusable service
  ("first consultation", "estate planning intake"), never when loosely
  implied by topic.
- intake_requirement.fields: short field labels, one per item.
- policy.body: short, declarative sentence; trim preamble.

RULES
- One JSON object per candidate item.
- "snippet" is a short verbatim excerpt from the source supporting the item.
- "confidence" is a 0..1 estimate of your certainty.
- Do not invent phone numbers, emails, hours, or staff names.
- Do not output duplicate items; if a topic appears multiple times, output once.`;

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "emit_extractions",
    description:
      "Return all grounded business knowledge items found in the source.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_type: {
                type: "string",
                enum: ENTITY_TYPES as unknown as string[],
              },
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
    if (!buf) { buf = p; continue; }
    if ((buf + "\n\n" + p).length > target) { out.push(buf); buf = p; }
    else buf += "\n\n" + p;
  }
  if (buf) out.push(buf);
  return out;
}

// ---------- Structured-directory deterministic logic (CSV path) ----------
// Mirrors src/lib/business-brain/csvParser.ts. Keep in sync.

const DESTINATION_LABEL_RE =
  /(billing|after.?hours|emergency|maintenance|fax|main.?line|reception|front.?desk|operator|24.?hour|on.?call|hotline|night.?line|sales.?line|support.?line|service.?line)/i;
const BUSINESS_LABEL_IN_NAME_RE =
  /(line|desk|department|team|support|service|billing|after.?hours|emergency|reception|fax|main|info|hotline|on.?call|operator|hours)/i;

function looksLikePersonName(s: unknown): boolean {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  if (BUSINESS_LABEL_IN_NAME_RE.test(t)) return false;
  return /[A-Za-z]/.test(t) && t.length >= 2;
}

function digits(s: unknown): string {
  return String(s ?? "").replace(/\D+/g, "");
}

interface CsvRow {
  name?: string;
  role?: string;
  department?: string;
  phone?: string;
  extension?: string;
  email?: string;
  label?: string;
  notes?: string;
}

function rowsToExtractions(
  rows: CsvRow[],
): Array<{
  entity_type: string;
  payload: Record<string, unknown>;
  snippet: string;
  confidence: number;
}> {
  const out: Array<{
    entity_type: string;
    payload: Record<string, unknown>;
    snippet: string;
    confidence: number;
  }> = [];
  const seenDept = new Set<string>();
  const seenStaff = new Set<string>();
  const seenPhone = new Set<string>();
  const seenDest = new Set<string>();

  for (const row of rows) {
    const snippet = JSON.stringify(row);
    const isPerson = looksLikePersonName(row.name);
    const labelIsDestination = !!row.label && DESTINATION_LABEL_RE.test(row.label);

    if (row.department) {
      const k = row.department.toLowerCase().trim();
      if (!seenDept.has(k)) {
        seenDept.add(k);
        out.push({
          entity_type: "department",
          payload: { name: row.department },
          snippet,
          confidence: 0.95,
        });
      }
    }

    if (isPerson && row.name) {
      const k = row.name.toLowerCase().trim();
      if (!seenStaff.has(k)) {
        seenStaff.add(k);
        const payload: Record<string, unknown> = { name: row.name };
        if (row.role) payload.role = row.role;
        if (row.department) payload.department = row.department;
        if (row.email) payload.email = row.email;
        if (row.phone) payload.phone = row.phone;
        out.push({ entity_type: "staff", payload, snippet, confidence: 0.95 });
      }
    }

    if (row.phone) {
      const norm = digits(row.phone);
      if (norm.length >= 7 && !seenPhone.has(norm)) {
        seenPhone.add(norm);
        const fallback = isPerson
          ? `${row.name}${row.role ? ` (${row.role})` : ""}`
          : row.label || row.department || "Phone";
        const payload: Record<string, unknown> = {
          label: row.label || fallback,
          number: row.phone,
        };
        if (row.extension) payload.extension = row.extension;
        if (row.department) payload.department = row.department;
        out.push({ entity_type: "phone", payload, snippet, confidence: 0.95 });
      }
    }

    if (!isPerson && labelIsDestination) {
      if (row.phone) {
        const k = `phone:${digits(row.phone)}`;
        if (!seenDest.has(k)) {
          seenDest.add(k);
          const payload: Record<string, unknown> = {
            label: row.label!,
            channel: "phone",
            value: row.phone,
          };
          if (row.notes) payload.notes = row.notes;
          out.push({
            entity_type: "destination_contact",
            payload,
            snippet,
            confidence: 0.9,
          });
        }
      } else if (row.email) {
        const k = `email:${row.email.toLowerCase()}`;
        if (!seenDest.has(k)) {
          seenDest.add(k);
          const payload: Record<string, unknown> = {
            label: row.label!,
            channel: "email",
            value: row.email,
          };
          if (row.notes) payload.notes = row.notes;
          out.push({
            entity_type: "destination_contact",
            payload,
            snippet,
            confidence: 0.9,
          });
        }
      }
    }
  }
  return out;
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: {
    sourceId?: string;
    text?: string;
    kind?: string;
    mode?: string;
    rows?: CsvRow[];
    pairs?: Array<{ question: string; answer: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: "bad_request" }, 400);
  }

  const sourceId = body.sourceId;
  if (!sourceId || typeof sourceId !== "string") {
    return jsonResponse({ ok: false, code: "bad_request", message: "sourceId required" }, 400);
  }

  const admin = adminClient();

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

  // ---------- Branch 1: structured directory (CSV) ----------
  if (body.mode === "structured_directory" && Array.isArray(body.rows)) {
    const rows = body.rows.filter((r) => r && typeof r === "object") as CsvRow[];
    const extractions = rowsToExtractions(rows);

    // One chunk per row for snippet provenance.
    const chunkRows = rows.map((r, i) => ({
      source_id: sourceId,
      workspace_id: srcRow.workspace_id,
      ordinal: i,
      text: JSON.stringify(r),
    }));
    let chunkIdByOrdinal = new Map<number, string>();
    if (chunkRows.length > 0) {
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
      chunkIdByOrdinal = new Map(
        (insertedChunks ?? []).map((r) => [r.ordinal as number, r.id as string]),
      );
    }

    const insertRows = extractions.map((ex) => {
      // Find which row index produced this snippet (best-effort via JSON match).
      const ordinal = rows.findIndex((r) => JSON.stringify(r) === ex.snippet);
      return {
        workspace_id: srcRow.workspace_id,
        source_id: sourceId,
        chunk_id: ordinal >= 0 ? chunkIdByOrdinal.get(ordinal) ?? null : null,
        entity_type: ex.entity_type,
        payload: ex.payload,
        snippet: ex.snippet,
        confidence: ex.confidence,
        review_status: "suggested",
        extraction_metadata: { method: "csv_deterministic" },
      };
    });

    if (insertRows.length > 0) {
      const { error: insErr } = await admin.from("bb_extractions").insert(insertRows);
      if (insErr) {
        await admin
          .from("bb_sources")
          .update({ status: "failed", status_message: insErr.message })
          .eq("id", sourceId);
        return jsonResponse({ ok: false, code: "db_error", message: insErr.message }, 500);
      }
    }

    await admin
      .from("bb_sources")
      .update({
        status: "processed",
        status_message: `Extracted ${insertRows.length} suggestion(s) from ${rows.length} row(s).`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    enqueueBbEmbed(srcRow.workspace_id, "chunks");
    return jsonResponse({ ok: true, extracted: insertRows.length, mode: "structured_directory" });
  }

  // ---------- Branch 2: structured FAQ pairs ----------
  if (body.kind === "paste_faq" && Array.isArray(body.pairs) && body.pairs.length >= 2) {
    const pairs = body.pairs.filter(
      (p) => p && typeof p.question === "string" && typeof p.answer === "string",
    );
    const chunkRows = pairs.map((p, i) => ({
      source_id: sourceId,
      workspace_id: srcRow.workspace_id,
      ordinal: i,
      text: `Q: ${p.question}\nA: ${p.answer}`,
    }));
    let chunkIdByOrdinal = new Map<number, string>();
    if (chunkRows.length > 0) {
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
      chunkIdByOrdinal = new Map(
        (insertedChunks ?? []).map((r) => [r.ordinal as number, r.id as string]),
      );
    }

    const insertRows = pairs.map((p, i) => ({
      workspace_id: srcRow.workspace_id,
      source_id: sourceId,
      chunk_id: chunkIdByOrdinal.get(i) ?? null,
      entity_type: "faq",
      payload: { question: p.question, answer: p.answer },
      snippet: `Q: ${p.question}\nA: ${p.answer}`.slice(0, 500),
      confidence: 0.9,
      review_status: "suggested",
      extraction_metadata: { method: "faq_pairs_deterministic" },
    }));

    if (insertRows.length > 0) {
      const { error: insErr } = await admin.from("bb_extractions").insert(insertRows);
      if (insErr) {
        await admin
          .from("bb_sources")
          .update({ status: "failed", status_message: insErr.message })
          .eq("id", sourceId);
        return jsonResponse({ ok: false, code: "db_error", message: insErr.message }, 500);
      }
    }

    await admin
      .from("bb_sources")
      .update({
        status: "processed",
        status_message: `Extracted ${insertRows.length} FAQ pair(s).`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    enqueueBbEmbed(srcRow.workspace_id, "chunks");
    return jsonResponse({ ok: true, extracted: insertRows.length, mode: "faq_pairs" });
  }

  // ---------- Branch 3: default AI extraction ----------
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return jsonResponse({ ok: false, code: "upstream_error", message: "AI not configured" }, 500);
  }

  const text = (body.text ?? "").toString();
  if (!text.trim()) {
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
    const chunkBody = chunks[i];
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
            { role: "user", content: `SOURCE CHUNK:\n\n${chunkBody}` },
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
      try { parsed = JSON.parse(rawArgs); } catch { continue; }
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const rows: Record<string, unknown>[] = [];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const row = it as Record<string, unknown>;
        const et = row.entity_type;
        if (typeof et !== "string" || !(ENTITY_TYPES as readonly string[]).includes(et)) continue;
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
        if (insErr) console.error("bb-ingest insert extractions", insErr);
        else totalExtracted += rows.length;
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

  enqueueBbEmbed(srcRow.workspace_id, "chunks");
  return jsonResponse({ ok: true, extracted: totalExtracted });
});
