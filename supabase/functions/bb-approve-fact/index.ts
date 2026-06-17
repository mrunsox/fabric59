/**
 * Business Brain — bb-approve-fact edge function.
 *
 * Promotes a suggested extraction into an approved fact. Conservative:
 *   - Without `mergeIntoFactId` → create a new bb_facts row.
 *   - With `mergeIntoFactId`    → merge source_refs into the named fact.
 *
 * No fuzzy or silent auto-merge. If the canonical_key already exists in
 * bb_facts (workspace+entity_type+key), the API rejects with 409 unless the
 * caller passes an explicit `mergeIntoFactId`.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

function normalize(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}
function digits(s: unknown): string {
  return String(s ?? "").replace(/\D+/g, "");
}

function canonicalKey(entityType: string, p: Record<string, unknown>): string {
  switch (entityType) {
    case "phone": return `phone:${digits(p.number)}`;
    case "staff": return `staff:${normalize(p.name)}`;
    case "department": return `dept:${normalize(p.name)}`;
    case "service": return `svc:${normalize(p.name)}`;
    case "hours": return `hours:${normalize(p.label)}`;
    case "destination_contact": return `dest:${normalize(p.channel)}:${normalize(p.value)}`;
    case "escalation_contact": return `esc:${normalize(p.channel)}:${normalize(p.value)}`;
    case "faq": return `faq:${normalize(p.question).slice(0, 200)}`;
    case "intake_requirement": return `intake:${normalize(p.label)}`;
    case "policy": return `policy:${normalize(p.title)}`;
    default: return `${entityType}:${normalize(JSON.stringify(p))}`;
  }
}

function displayName(entityType: string, p: Record<string, unknown>): string {
  switch (entityType) {
    case "phone": return String(p.label ?? p.number ?? "Phone");
    case "staff": return String(p.name ?? "Staff");
    case "department": return String(p.name ?? "Department");
    case "service": return String(p.name ?? "Service");
    case "hours": return String(p.label ?? "Hours");
    case "destination_contact": return String(p.label ?? p.value ?? "Destination");
    case "escalation_contact": return String(p.label ?? p.value ?? "Escalation");
    case "faq": return String(p.question ?? "FAQ").slice(0, 120);
    case "intake_requirement": return String(p.label ?? "Intake requirement");
    case "policy": return String(p.title ?? "Policy");
    default: return entityType;
  }
}

interface IncomingRef { source_id: string; extraction_id: string | null; snippet: string | null }

function mergeSourceRefs(existing: IncomingRef[], incoming: IncomingRef[]): IncomingRef[] {
  const seen = new Set<string>();
  const key = (r: IncomingRef) => `${r.source_id}|${r.extraction_id ?? ""}|${(r.snippet ?? "").slice(0, 200)}`;
  const out: IncomingRef[] = [];
  for (const r of existing) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  for (const r of incoming) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: { extractionId?: string; payloadOverride?: Record<string, unknown> | null; mergeIntoFactId?: string | null };
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, code: "bad_request" }, 400); }

  const extractionId = body.extractionId;
  if (!extractionId || typeof extractionId !== "string") {
    return jsonResponse({ ok: false, code: "bad_request", message: "extractionId required" }, 400);
  }

  const admin = adminClient();

  const { data: ext, error: extErr } = await admin
    .from("bb_extractions")
    .select("id, workspace_id, source_id, entity_type, payload, snippet, confidence, review_status")
    .eq("id", extractionId)
    .maybeSingle();
  if (extErr || !ext) return jsonResponse({ ok: false, code: "not_found" }, 404);

  if (ext.review_status !== "suggested") {
    return jsonResponse({ ok: false, code: "already_reviewed", message: `Extraction is ${ext.review_status}` }, 409);
  }

  const { data: canAccess, error: roleErr } = await admin.rpc("has_workspace_role_min", {
    _user_id: auth.user.id,
    _workspace_id: ext.workspace_id,
    _min: "manager",
  });
  if (roleErr || !canAccess) return jsonResponse({ ok: false, code: "forbidden" }, 403);

  const payload = (body.payloadOverride && typeof body.payloadOverride === "object")
    ? body.payloadOverride as Record<string, unknown>
    : (ext.payload as Record<string, unknown>);

  const incomingRefs: IncomingRef[] = [{
    source_id: ext.source_id,
    extraction_id: ext.id,
    snippet: ext.snippet ?? null,
  }];

  let factId: string;
  let merged = false;

  if (body.mergeIntoFactId) {
    const { data: existing, error: fErr } = await admin
      .from("bb_facts")
      .select("id, workspace_id, source_refs, payload")
      .eq("id", body.mergeIntoFactId)
      .maybeSingle();
    if (fErr || !existing) return jsonResponse({ ok: false, code: "merge_target_not_found" }, 404);
    if (existing.workspace_id !== ext.workspace_id) {
      return jsonResponse({ ok: false, code: "cross_workspace_merge" }, 400);
    }
    const newRefs = mergeSourceRefs(
      (existing.source_refs as IncomingRef[]) ?? [],
      incomingRefs,
    );
    const { error: updErr } = await admin
      .from("bb_facts")
      .update({
        source_refs: newRefs,
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: auth.user.id,
      })
      .eq("id", existing.id);
    if (updErr) return jsonResponse({ ok: false, code: "db_error", message: updErr.message }, 500);
    factId = existing.id;
    merged = true;
  } else {
    const key = canonicalKey(ext.entity_type, payload);
    // Conflict check: same canonical key must not silently overwrite.
    const { data: conflict } = await admin
      .from("bb_facts")
      .select("id")
      .eq("workspace_id", ext.workspace_id)
      .eq("entity_type", ext.entity_type)
      .eq("canonical_key", key)
      .maybeSingle();
    if (conflict && (conflict as { id: string }).id) {
      return jsonResponse({
        ok: false,
        code: "duplicate_canonical_key",
        message: "An approved fact with this key already exists. Use mergeIntoFactId to combine.",
        existingFactId: (conflict as { id: string }).id,
      }, 409);
    }
    const { data: created, error: insErr } = await admin
      .from("bb_facts")
      .insert([{
        workspace_id: ext.workspace_id,
        entity_type: ext.entity_type,
        canonical_key: key,
        display_name: displayName(ext.entity_type, payload),
        payload,
        confidence_at_review: ext.confidence,
        verification_state: "approved",
        source_refs: incomingRefs,
        last_reviewed_by: auth.user.id,
      }])
      .select("id")
      .single();
    if (insErr || !created) {
      return jsonResponse({ ok: false, code: "db_error", message: insErr?.message ?? "insert failed" }, 500);
    }
    factId = (created as { id: string }).id;
  }

  await admin
    .from("bb_extractions")
    .update({
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewer_id: auth.user.id,
      approved_fact_id: factId,
    })
    .eq("id", extractionId);

  await admin
    .from("bb_review_events")
    .insert([{
      workspace_id: ext.workspace_id,
      extraction_id: extractionId,
      fact_id: factId,
      action: merged ? "merge" : "approve",
      actor_id: auth.user.id,
      diff: { payload },
    }]);

  return jsonResponse({ ok: true, factId, merged });
});
