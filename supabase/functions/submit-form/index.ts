// Public POST endpoint for submitting form responses.
// Validates against the form's published schema, applies dot-path mapping into
// the campaign intake payload shape, and persists the submission.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

type FormFieldType =
  | "text" | "textarea" | "email" | "phone" | "number"
  | "select" | "checkbox" | "date";

type FormConditionOp = "equals" | "not_equals" | "is_empty" | "is_not_empty";

interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: { label: string; value: string }[];
  visibleIf?: { fieldId: string; op: FormConditionOp; value?: string };
  mapping?: string;
}

interface FormSchema { fields: FormField[]; confirmation?: string }

const BodySchema = z.object({
  formId: z.string().uuid(),
  values: z.record(z.unknown()),
  source: z.string().max(64).optional(),
  campaignId: z.string().uuid().optional(),
});

function isVisible(f: FormField, values: Record<string, unknown>, all: FormField[]): boolean {
  const c = f.visibleIf;
  if (!c) return true;
  const ref = all.find((x) => x.id === c.fieldId);
  if (!ref) return true;
  const v = values[ref.key];
  switch (c.op) {
    case "equals":       return String(v ?? "") === String(c.value ?? "");
    case "not_equals":   return String(v ?? "") !== String(c.value ?? "");
    case "is_empty":     return v === undefined || v === null || v === "";
    case "is_not_empty": return !(v === undefined || v === null || v === "");
  }
}

function coerce(field: FormField, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === "") return null;
  switch (field.type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox": return Boolean(raw);
    default: return typeof raw === "string" ? raw.trim() : raw;
  }
}

function validate(schema: FormSchema, values: Record<string, unknown>): { ok: true; clean: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const clean: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (!isVisible(f, values, schema.fields)) continue;
    const v = coerce(f, values[f.key]);
    if (f.required && (v === null || v === "")) {
      errors[f.key] = `${f.label} is required`;
      continue;
    }
    if (v !== null && f.type === "email" && !z.string().email().safeParse(v).success) {
      errors[f.key] = `${f.label} must be a valid email`;
      continue;
    }
    if (v !== null && f.type === "select" && f.options?.length && !f.options.some((o) => o.value === v)) {
      errors[f.key] = `${f.label} has an invalid selection`;
      continue;
    }
    clean[f.key] = v;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, clean };
}

function buildMapped(schema: FormSchema, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (!f.mapping) continue;
    if (!isVisible(f, values, schema.fields)) continue;
    const parts = f.mapping.split(".");
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = values[f.key];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { formId, values, source, campaignId } = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: form, error: formErr } = await admin
    .from("forms")
    .select("id, workspace_id, status, current_version")
    .eq("id", formId)
    .maybeSingle();
  if (formErr || !form) {
    return new Response(JSON.stringify({ error: "Form not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (form.status !== "published") {
    return new Response(JSON.stringify({ error: "Form is not accepting submissions" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: ver } = await admin
    .from("form_versions")
    .select("schema, version")
    .eq("form_id", formId)
    .eq("version", form.current_version)
    .maybeSingle();
  const schema = (ver?.schema ?? {}) as FormSchema;
  if (!schema.fields || !Array.isArray(schema.fields)) {
    return new Response(JSON.stringify({ error: "Form has no published schema" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const validated = validate(schema, values);
  if (!validated.ok) {
    return new Response(JSON.stringify({ error: "Validation failed", fieldErrors: validated.errors }), {
      status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mapped = buildMapped(schema, validated.clean);

  // Resolve campaign: explicit > assigned (first)
  let resolvedCampaignId: string | null = null;
  if (campaignId) {
    const { data: assigned } = await admin
      .from("form_campaign_assignments")
      .select("campaign_id")
      .eq("form_id", formId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (assigned) resolvedCampaignId = assigned.campaign_id;
  }
  if (!resolvedCampaignId) {
    const { data: assignments } = await admin
      .from("form_campaign_assignments")
      .select("campaign_id")
      .eq("form_id", formId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (assignments && assignments.length > 0) resolvedCampaignId = assignments[0].campaign_id;
  }

  const { data: submission, error: insertErr } = await admin
    .from("form_submissions")
    .insert({
      workspace_id: form.workspace_id,
      form_id: form.id,
      form_version: ver?.version ?? form.current_version,
      campaign_id: resolvedCampaignId,
      source: source ?? "public",
      payload: validated.clean,
      mapped,
    })
    .select("id, submitted_at")
    .single();

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    submissionId: submission.id,
    submittedAt: submission.submitted_at,
    campaignId: resolvedCampaignId,
    mapped,
    confirmation: schema.confirmation ?? "Thanks — your response has been recorded.",
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
