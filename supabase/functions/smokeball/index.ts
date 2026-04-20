// Smokeball adapter — intake-first, region-aware (AU / US / UK).
// Phase 4 of the Legal Connect master build.
//
// Smokeball API: https://api.smokeball.com.au/docs (region-specific)
// Auth: OAuth 2.0 Authorization Code with refresh tokens.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import type {
  AdapterConnectionContext,
  ContactSearchQuery,
  LegalCrmAdapter,
  MatterSearchQuery,
} from "../_shared/legal-crm-adapter.ts";
import type {
  AdapterResult,
  NormalizedContact,
  NormalizedLead,
  NormalizedMatter,
  NormalizedNote,
  NormalizedTask,
  ProviderEvent,
} from "../_shared/normalized-entities.ts";

const REGION_BASE_URLS: Record<string, string> = {
  AU: "https://api.smokeball.com.au/v2",
  US: "https://api.smokeball.com/v2",
  UK: "https://api.smokeball.co.uk/v2",
};

function baseUrlFor(ctx: AdapterConnectionContext): string {
  if (ctx.base_url) return ctx.base_url;
  const region = ctx.region ?? "US";
  return REGION_BASE_URLS[region] ?? REGION_BASE_URLS.US;
}

async function smokeballFetch(
  ctx: AdapterConnectionContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  if (!ctx.access_token) return { ok: false, status: 401, data: { error: "missing access token" } };
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${ctx.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${baseUrlFor(ctx)}${path}`, opts);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }
    let data: any = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  }
  return { ok: false, status: 0, data: { error: "Max retries exceeded" } };
}

function normContact(raw: any): NormalizedContact {
  return {
    provider_id: String(raw.id ?? raw.contactId),
    first_name: raw.firstName ?? raw.first_name,
    last_name: raw.lastName ?? raw.last_name,
    full_name: raw.displayName ?? `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim(),
    email: raw.email ?? raw.primaryEmail,
    phone: raw.phone ?? raw.primaryPhone,
    organization_name: raw.companyName,
    metadata: { raw },
  };
}

function normMatter(raw: any): NormalizedMatter {
  return {
    provider_id: String(raw.id ?? raw.matterId),
    display_number: raw.matterNumber ?? raw.fileNumber,
    description: raw.description ?? raw.title,
    status: raw.status,
    contact_id: raw.clientId ? String(raw.clientId) : undefined,
    practice_area: raw.practiceArea,
    metadata: {},
  };
}

export const smokeballAdapter: LegalCrmAdapter = {
  provider: "smokeball",

  async whoAmI(ctx) {
    const res = await smokeballFetch(ctx, "GET", "/me");
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: { user_id: String(res.data.id), account_name: res.data.firmName ?? res.data.name } };
  },

  async refreshToken(ctx) {
    const clientId = Deno.env.get("SMOKEBALL_CLIENT_ID");
    const clientSecret = Deno.env.get("SMOKEBALL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return { ok: false, status: 500, error: "Smokeball OAuth secrets not configured" };
    if (!ctx.refresh_token) return { ok: false, status: 400, error: "no refresh token on connection" };

    const tokenUrl = `${baseUrlFor(ctx).replace("/v2", "")}/oauth/token`;
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: ctx.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) return { ok: false, status: res.status, error: `smokeball refresh failed: ${await res.text()}` };
    const tokens = await res.json();
    return {
      ok: true,
      status: 200,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? ctx.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      },
    };
  },

  async searchContact(ctx, query: ContactSearchQuery): Promise<AdapterResult<NormalizedContact[]>> {
    const params = new URLSearchParams();
    if (query.email) params.set("email", query.email);
    if (query.phone) params.set("phone", query.phone);
    if (query.full_name) params.set("name", query.full_name);
    const res = await smokeballFetch(ctx, "GET", `/contacts?${params.toString()}`);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const list = (res.data.contacts ?? res.data.data ?? []).map(normContact);
    return { ok: true, status: res.status, data: list };
  },

  async createContact(ctx, contact) {
    const body = {
      firstName: contact.first_name ?? contact.full_name?.split(" ")[0] ?? "Unknown",
      lastName: contact.last_name ?? contact.full_name?.split(" ").slice(1).join(" ") ?? "Caller",
      email: contact.email,
      phone: contact.phone,
      companyName: contact.organization_name,
    };
    const res = await smokeballFetch(ctx, "POST", "/contacts", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: normContact(res.data.contact ?? res.data) };
  },

  async searchMatter(ctx, query: MatterSearchQuery): Promise<AdapterResult<NormalizedMatter[]>> {
    const params = new URLSearchParams();
    if (query.contact_id) params.set("clientId", query.contact_id);
    if (query.status) params.set("status", query.status);
    const res = await smokeballFetch(ctx, "GET", `/matters?${params.toString()}`);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const list = (res.data.matters ?? res.data.data ?? []).map(normMatter);
    return { ok: true, status: res.status, data: list };
  },

  async createMatter(ctx, matter: NormalizedMatter) {
    if (!matter.contact_id) return { ok: false, status: 400, error: "contact_id required to create Smokeball matter" };
    const body = {
      clientId: matter.contact_id,
      description: matter.description ?? "New matter",
      practiceArea: matter.practice_area,
      status: matter.status ?? "open",
    };
    const res = await smokeballFetch(ctx, "POST", "/matters", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: normMatter(res.data.matter ?? res.data) };
  },

  async createLead(ctx, lead: NormalizedLead) {
    const body = {
      source: lead.source ?? "Five9 Inbound",
      intakeType: lead.intake_type,
      status: lead.status ?? "new",
      contact: lead.contact ? {
        firstName: lead.contact.first_name,
        lastName: lead.contact.last_name,
        email: lead.contact.email,
        phone: lead.contact.phone,
      } : undefined,
      notes: lead.notes,
    };
    const res = await smokeballFetch(ctx, "POST", "/leads", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const data = res.data.lead ?? res.data;
    return {
      ok: true,
      status: res.status,
      data: {
        provider_id: String(data.id),
        source: data.source,
        intake_type: data.intakeType,
        status: data.status,
        contact: data.contact ? normContact(data.contact) : undefined,
      },
    };
  },

  async createNote(ctx, note: NormalizedNote) {
    const body: Record<string, unknown> = {
      subject: note.subject ?? "Call note",
      content: note.content,
    };
    if (note.matter_id) body.matterId = note.matter_id;
    else if (note.lead_id) body.leadId = note.lead_id;
    else if (note.contact_id) body.contactId = note.contact_id;
    const res = await smokeballFetch(ctx, "POST", "/notes", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const data = res.data.note ?? res.data;
    return { ok: true, status: res.status, data: { provider_id: String(data.id), subject: data.subject, content: data.content } };
  },

  async createTask(ctx, task: NormalizedTask) {
    const body: Record<string, unknown> = {
      subject: task.subject,
      description: task.description,
      dueDate: task.due_date,
      priority: task.priority,
    };
    if (task.matter_id) body.matterId = task.matter_id;
    else if (task.lead_id) body.leadId = task.lead_id;
    const res = await smokeballFetch(ctx, "POST", "/tasks", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const data = res.data.task ?? res.data;
    return { ok: true, status: res.status, data: { provider_id: String(data.id), subject: data.subject, description: data.description } };
  },

  async verifyWebhookSignature(rawBody, signature, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === signature || `sha256=${hex}` === signature;
  },

  async normalizeEvent(rawEvent: Record<string, any>): Promise<ProviderEvent> {
    return {
      event_id: String(rawEvent.id ?? rawEvent.eventId ?? crypto.randomUUID()),
      event_type: String(rawEvent.eventType ?? rawEvent.type ?? "unknown"),
      resource_type: String(rawEvent.resourceType ?? rawEvent.entityType ?? "unknown"),
      resource_id: String(rawEvent.resourceId ?? rawEvent.entityId ?? ""),
      occurred_at: rawEvent.occurredAt ?? rawEvent.timestamp ?? new Date().toISOString(),
      raw: rawEvent,
    };
  },
};

// ─── HTTP entry point ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) return jsonResponse({ error: "Missing X-Tenant-Id header" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conn } = await supabase
      .from("legal_connect_connections")
      .select("*")
      .eq("client_id", tenantId)
      .eq("provider", "smokeball")
      .eq("status", "connected")
      .maybeSingle();

    if (!conn) return jsonResponse({ error: "No active Smokeball connection for tenant" }, 404);

    const ctx: AdapterConnectionContext = {
      connection_id: conn.id,
      client_id: conn.client_id,
      organization_id: conn.organization_id,
      provider: "smokeball",
      access_token: conn.encrypted_access_token,
      refresh_token: conn.encrypted_refresh_token,
      base_url: conn.base_url,
      region: conn.provider_region,
    };

    const { action, payload } = await req.json();
    let result: AdapterResult<any>;

    switch (action) {
      case "whoAmI": result = await smokeballAdapter.whoAmI(ctx); break;
      case "searchContact": result = await smokeballAdapter.searchContact(ctx, payload ?? {}); break;
      case "createContact": result = await smokeballAdapter.createContact(ctx, payload); break;
      case "searchMatter": result = await smokeballAdapter.searchMatter(ctx, payload ?? {}); break;
      case "createMatter": result = await smokeballAdapter.createMatter!(ctx, payload); break;
      case "createLead": result = await smokeballAdapter.createLead!(ctx, payload); break;
      case "createNote": result = await smokeballAdapter.createNote(ctx, payload); break;
      case "createTask": result = await smokeballAdapter.createTask!(ctx, payload); break;
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    return jsonResponse({ success: result.ok, ...result }, result.ok ? 200 : (result.status || 500));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Smokeball adapter error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
