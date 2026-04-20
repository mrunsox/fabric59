// Clio adapter — reference implementation of LegalCrmAdapter.
// Phase 2 of the Legal Connect master build.
//
// Clio API: https://docs.developers.clio.com/clio-manage/api-reference/
// Auth: OAuth 2.0 Authorization Code with refresh tokens.
// Webhooks: 31-day expiry, must be renewed.

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
  NormalizedActivity,
  NormalizedContact,
  NormalizedMatter,
  NormalizedNote,
  NormalizedTask,
  ProviderEvent,
} from "../_shared/normalized-entities.ts";

const CLIO_BASE_URL = "https://app.clio.com/api/v4";

async function clioFetch(
  ctx: AdapterConnectionContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  if (!ctx.access_token) {
    return { ok: false, status: 401, data: { error: "missing access token" } };
  }
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
    const res = await fetch(`${CLIO_BASE_URL}${path}`, opts);
    if (res.status === 429 || res.status >= 500) {
      const wait = 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
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
    provider_id: String(raw.id),
    first_name: raw.first_name,
    last_name: raw.last_name,
    full_name: raw.name ?? `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim(),
    email: raw.primary_email_address ?? raw.email_addresses?.[0]?.address,
    phone: raw.primary_phone_number ?? raw.phone_numbers?.[0]?.number,
    organization_name: raw.company?.name,
    metadata: { type: raw.type },
  };
}

function normMatter(raw: any): NormalizedMatter {
  return {
    provider_id: String(raw.id),
    display_number: raw.display_number,
    description: raw.description,
    status: raw.status,
    contact_id: raw.client?.id ? String(raw.client.id) : undefined,
    practice_area: raw.practice_area?.name,
    opened_at: raw.open_date,
    metadata: {},
  };
}

export const clioAdapter: LegalCrmAdapter = {
  provider: "clio",

  async whoAmI(ctx) {
    const res = await clioFetch(ctx, "GET", "/users/who_am_i.json?fields=id,name,email");
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: { user_id: String(res.data.data?.id), account_name: res.data.data?.name } };
  },

  async refreshToken(ctx) {
    const clientId = Deno.env.get("CLIO_CLIENT_ID");
    const clientSecret = Deno.env.get("CLIO_CLIENT_SECRET");
    if (!clientId || !clientSecret) return { ok: false, status: 500, error: "Clio OAuth secrets not configured" };
    if (!ctx.refresh_token) return { ok: false, status: 400, error: "no refresh token on connection" };

    const res = await fetch("https://app.clio.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: ctx.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, status: res.status, error: `clio refresh failed: ${txt}` };
    }
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

  async deauthorize(ctx) {
    // Clio has no programmatic deauth endpoint; revocation is via user account.
    // We just mark the connection revoked locally — handled by caller.
    return { ok: true, status: 204 };
  },

  async searchContact(ctx, query: ContactSearchQuery): Promise<AdapterResult<NormalizedContact[]>> {
    const params = new URLSearchParams({ fields: "id,name,first_name,last_name,primary_email_address,primary_phone_number,type,company{name}" });
    if (query.email) params.set("email_address", query.email);
    if (query.phone) params.set("phone_number", query.phone);
    if (query.full_name && !query.email && !query.phone) params.set("query", query.full_name);
    const res = await clioFetch(ctx, "GET", `/contacts.json?${params.toString()}`);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const list = (res.data.data ?? []).map(normContact);
    return { ok: true, status: res.status, data: list };
  },

  async createContact(ctx, contact) {
    const body = {
      data: {
        type: "Person",
        first_name: contact.first_name ?? contact.full_name?.split(" ")[0] ?? "Unknown",
        last_name: contact.last_name ?? contact.full_name?.split(" ").slice(1).join(" ") ?? "Caller",
        email_addresses: contact.email ? [{ name: "Work", address: contact.email, default_email: true }] : undefined,
        phone_numbers: contact.phone ? [{ name: "Work", number: contact.phone, default_number: true }] : undefined,
      },
    };
    const res = await clioFetch(ctx, "POST", "/contacts.json?fields=id,name,first_name,last_name,primary_email_address,primary_phone_number", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: normContact(res.data.data) };
  },

  async updateContact(ctx, contact_id, patch) {
    const body = {
      data: {
        first_name: patch.first_name,
        last_name: patch.last_name,
        email_addresses: patch.email ? [{ name: "Work", address: patch.email, default_email: true }] : undefined,
        phone_numbers: patch.phone ? [{ name: "Work", number: patch.phone, default_number: true }] : undefined,
      },
    };
    const res = await clioFetch(ctx, "PATCH", `/contacts/${contact_id}.json`, body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: normContact(res.data.data) };
  },

  async searchMatter(ctx, query: MatterSearchQuery): Promise<AdapterResult<NormalizedMatter[]>> {
    const params = new URLSearchParams({ fields: "id,display_number,description,status,client{id,name},practice_area{name},open_date" });
    if (query.contact_id) params.set("client_id", query.contact_id);
    if (query.status) params.set("status", query.status);
    if (query.display_number) params.set("query", query.display_number);
    const res = await clioFetch(ctx, "GET", `/matters.json?${params.toString()}`);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    const list = (res.data.data ?? []).map(normMatter);
    return { ok: true, status: res.status, data: list };
  },

  async createMatter(ctx, matter: NormalizedMatter) {
    if (!matter.contact_id) return { ok: false, status: 400, error: "contact_id required to create Clio matter" };
    const body = {
      data: {
        client: { id: Number(matter.contact_id) },
        description: matter.description ?? "New matter",
        status: matter.status ?? "open",
      },
    };
    const res = await clioFetch(ctx, "POST", "/matters.json?fields=id,display_number,description,status,client{id,name}", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return { ok: true, status: res.status, data: normMatter(res.data.data) };
  },

  async createNote(ctx, note: NormalizedNote) {
    const body = {
      data: {
        subject: note.subject ?? "Call note",
        detail: note.content,
        type: "Matter",
        ...(note.matter_id ? { matter: { id: Number(note.matter_id) } } : {}),
        ...(note.contact_id && !note.matter_id ? { contact: { id: Number(note.contact_id) } } : {}),
      },
    };
    const res = await clioFetch(ctx, "POST", "/notes.json?fields=id,subject,detail", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return {
      ok: true,
      status: res.status,
      data: { provider_id: String(res.data.data?.id), subject: res.data.data?.subject, content: res.data.data?.detail },
    };
  },

  async createTask(ctx, task: NormalizedTask) {
    const body = {
      data: {
        name: task.subject,
        description: task.description,
        due_at: task.due_date,
        priority: task.priority === "urgent" ? "high" : task.priority,
        ...(task.matter_id ? { matter: { id: Number(task.matter_id) } } : {}),
      },
    };
    const res = await clioFetch(ctx, "POST", "/tasks.json?fields=id,name,description,due_at,priority", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return {
      ok: true,
      status: res.status,
      data: { provider_id: String(res.data.data?.id), subject: res.data.data?.name, description: res.data.data?.description },
    };
  },

  async createActivity(ctx, activity: NormalizedActivity) {
    const body = {
      data: {
        type: "TimeEntry",
        date: activity.occurred_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        quantity: (activity.duration_seconds ?? 0) / 3600,
        note: activity.description ?? activity.subject,
        ...(activity.matter_id ? { matter: { id: Number(activity.matter_id) } } : {}),
      },
    };
    const res = await clioFetch(ctx, "POST", "/activities.json?fields=id,note,quantity", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    return {
      ok: true,
      status: res.status,
      data: { provider_id: String(res.data.data?.id), type: activity.type, description: res.data.data?.note },
    };
  },

  async subscribeWebhooks(ctx, callback_url, secret) {
    const body = {
      data: {
        url: callback_url,
        events: ["matter.create", "matter.update", "contact.create", "contact.update", "task.create", "note.create"],
        shared_secret: secret,
      },
    };
    const res = await clioFetch(ctx, "POST", "/webhooks.json?fields=id,url,events", body);
    if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(res.data) };
    // Clio webhooks expire after 31 days
    return {
      ok: true,
      status: res.status,
      data: {
        subscription_id: String(res.data.data?.id),
        expires_at: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
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
      event_id: String(rawEvent.id ?? rawEvent.event_id ?? crypto.randomUUID()),
      event_type: String(rawEvent.event_type ?? rawEvent.event ?? "unknown"),
      resource_type: String(rawEvent.resource_type ?? rawEvent.subject_type ?? "unknown"),
      resource_id: String(rawEvent.resource_id ?? rawEvent.subject_id ?? ""),
      occurred_at: rawEvent.occurred_at ?? rawEvent.created_at ?? new Date().toISOString(),
      raw: rawEvent,
    };
  },
};

// ─── HTTP entry point (allows direct invocation for testing) ─────────────────

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
      .eq("provider", "clio")
      .eq("status", "connected")
      .maybeSingle();

    if (!conn) return jsonResponse({ error: "No active Clio connection for tenant" }, 404);

    const ctx: AdapterConnectionContext = {
      connection_id: conn.id,
      client_id: conn.client_id,
      organization_id: conn.organization_id,
      provider: "clio",
      access_token: conn.encrypted_access_token ?? undefined,
      refresh_token: conn.encrypted_refresh_token ?? undefined,
    };

    const { action, payload } = await req.json();
    let result: AdapterResult<any>;

    switch (action) {
      case "whoAmI": result = await clioAdapter.whoAmI(ctx); break;
      case "searchContact": result = await clioAdapter.searchContact(ctx, payload ?? {}); break;
      case "createContact": result = await clioAdapter.createContact(ctx, payload); break;
      case "searchMatter": result = await clioAdapter.searchMatter(ctx, payload ?? {}); break;
      case "createMatter": result = await clioAdapter.createMatter!(ctx, payload); break;
      case "createNote": result = await clioAdapter.createNote(ctx, payload); break;
      case "createTask": result = await clioAdapter.createTask!(ctx, payload); break;
      case "createActivity": result = await clioAdapter.createActivity!(ctx, payload); break;
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    return jsonResponse({ success: result.ok, ...result }, result.ok ? 200 : (result.status || 500));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clio adapter error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
