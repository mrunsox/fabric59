// MyCase adapter — capability-aware implementation of LegalCrmAdapter.
// Phase 3 of the Legal Connect master build.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
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
} from "../_shared/normalized-entities.ts";
import { unsupported } from "../_shared/legal-crm-adapter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

const MYCASE_BASE_URL = "https://api.mycase.com/v2";

// ─── Low-level fetch with retry/backoff ──────────────────────────
async function mycaseFetch(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${MYCASE_BASE_URL}${path}`, opts);
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      if (attempt === 2) {
        return { ok: false, status: 0, data: { error: (e as Error).message } };
      }
    }
  }
  return { ok: false, status: 0, data: { error: "Max retries exceeded" } };
}

// ─── LegalCrmAdapter implementation ──────────────────────────────
export const mycaseAdapter: LegalCrmAdapter = {
  provider: "mycase",

  async whoAmI(ctx) {
    const key = ctx.access_token;
    if (!key) return { ok: false, status: 401, error: "missing api key" };
    const res = await mycaseFetch("GET", "/firm", key);
    if (!res.ok) {
      return { ok: false, status: res.status, error: "unable to authenticate", retryable: res.status >= 500 };
    }
    return {
      ok: true,
      status: 200,
      data: {
        user_id: res.data?.firm?.id?.toString(),
        account_name: res.data?.firm?.name,
      },
    };
  },

  async searchContact(ctx, query: ContactSearchQuery) {
    const key = ctx.access_token!;
    let qs = "";
    if (query.email) qs = `email=${encodeURIComponent(query.email)}`;
    else if (query.phone) qs = `phone=${encodeURIComponent(query.phone)}`;
    else if (query.full_name) qs = `query=${encodeURIComponent(query.full_name)}`;
    else if (query.provider_id) {
      const res = await mycaseFetch("GET", `/contacts/${query.provider_id}`, key);
      if (!res.ok) return { ok: false, status: res.status, error: "not found" };
      return { ok: true, status: 200, data: [normalizeContact(res.data?.contact ?? res.data)] };
    }
    const res = await mycaseFetch("GET", `/contacts?${qs}`, key);
    if (!res.ok) return { ok: false, status: res.status, error: "search failed", retryable: res.status >= 500 };
    const arr = (res.data?.contacts ?? []).map(normalizeContact);
    return { ok: true, status: 200, data: arr };
  },

  async createContact(ctx, contact: NormalizedContact) {
    const key = ctx.access_token!;
    const res = await mycaseFetch("POST", "/contacts", key, {
      contact: {
        first_name: contact.first_name ?? "Unknown",
        last_name: contact.last_name ?? "Caller",
        phone: contact.phone,
        email: contact.email,
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `create_contact failed: ${JSON.stringify(res.data)}`,
        retryable: res.status >= 500,
      };
    }
    return { ok: true, status: 201, data: normalizeContact(res.data?.contact) };
  },

  async updateContact(ctx, contact_id, patch) {
    const key = ctx.access_token!;
    const res = await mycaseFetch("PATCH", `/contacts/${contact_id}`, key, {
      contact: {
        first_name: patch.first_name,
        last_name: patch.last_name,
        phone: patch.phone,
        email: patch.email,
      },
    });
    if (!res.ok) return { ok: false, status: res.status, error: "update failed", retryable: res.status >= 500 };
    return { ok: true, status: 200, data: normalizeContact(res.data?.contact) };
  },

  async searchMatter(ctx, query: MatterSearchQuery) {
    const key = ctx.access_token!;
    const params: string[] = [];
    if (query.contact_id) params.push(`contact_id=${query.contact_id}`);
    if (query.status) params.push(`status=${query.status}`);
    if (query.display_number) params.push(`number=${encodeURIComponent(query.display_number)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const res = await mycaseFetch("GET", `/cases${qs}`, key);
    if (!res.ok) return { ok: false, status: res.status, error: "matter search failed" };
    const arr = (res.data?.cases ?? []).map(normalizeMatter);
    return { ok: true, status: 200, data: arr };
  },

  async createNote(ctx, note: NormalizedNote) {
    const key = ctx.access_token!;
    const payload: any = {
      note: {
        subject: note.subject ?? "Note",
        content: note.content,
      },
    };
    if (note.matter_id) payload.note.case_id = Number(note.matter_id);
    else if (note.contact_id) payload.note.contact_id = Number(note.contact_id);
    const res = await mycaseFetch("POST", "/notes", key, payload);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `create_note failed: ${JSON.stringify(res.data)}`,
        retryable: res.status >= 500,
      };
    }
    return { ok: true, status: 201, data: { ...note, provider_id: res.data?.note?.id?.toString() } };
  },

  async createTask(ctx, task: NormalizedTask) {
    const key = ctx.access_token!;
    const payload: any = {
      task: {
        subject: task.subject,
        description: task.description,
        due_date: task.due_date,
      },
    };
    if (task.matter_id) payload.task.case_id = Number(task.matter_id);
    if (task.contact_id) payload.task.contact_id = Number(task.contact_id);
    const res = await mycaseFetch("POST", "/tasks", key, payload);
    if (!res.ok) {
      // Tasks may not be enabled for all MyCase tiers — capability matrix marks this conditional.
      if (res.status === 404 || res.status === 403) return unsupported("mycase.create_task");
      return { ok: false, status: res.status, error: "task create failed", retryable: res.status >= 500 };
    }
    return { ok: true, status: 201, data: { ...task, provider_id: res.data?.task?.id?.toString() } };
  },

  async createActivity(ctx, activity: NormalizedActivity) {
    // MyCase has no first-class Activity object; surface as a note tagged activity.
    return mycaseAdapter.createNote!(ctx, {
      subject: `[${activity.type}] ${activity.subject ?? ""}`.trim(),
      content: activity.description ?? "",
      matter_id: activity.matter_id,
      contact_id: activity.contact_id,
      metadata: { activity_type: activity.type, occurred_at: activity.occurred_at, ...activity.metadata },
    });
  },

  async createMatter(ctx, matter: NormalizedMatter) {
    const key = ctx.access_token!;
    const res = await mycaseFetch("POST", "/cases", key, {
      case: {
        name: matter.description ?? "New Case",
        contact_id: matter.contact_id ? Number(matter.contact_id) : undefined,
      },
    });
    if (!res.ok) {
      if (res.status === 403) return unsupported("mycase.create_matter");
      return { ok: false, status: res.status, error: "matter create failed", retryable: res.status >= 500 };
    }
    return { ok: true, status: 201, data: normalizeMatter(res.data?.case) };
  },

  async createLead() {
    return unsupported("mycase.create_lead");
  },
};

function normalizeContact(c: any): NormalizedContact {
  if (!c) return {};
  return {
    provider_id: c.id?.toString(),
    first_name: c.first_name,
    last_name: c.last_name,
    full_name: [c.first_name, c.last_name].filter(Boolean).join(" "),
    email: c.email,
    phone: c.phone ?? c.cell_phone ?? c.work_phone,
    organization_name: c.company_name,
  };
}

function normalizeMatter(m: any): NormalizedMatter {
  if (!m) return {};
  return {
    provider_id: m.id?.toString(),
    display_number: m.number ?? m.display_number,
    description: m.name ?? m.description,
    status: m.status,
    contact_id: m.primary_contact_id?.toString(),
    practice_area: m.practice_area,
    opened_at: m.created_at,
  };
}

// ─── HTTP entrypoint (preserves existing legacy contract used by sync worker) ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing X-Tenant-Id header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant } = await supabase
      .from("tenants")
      .select("integration_configs, organization_id")
      .eq("id", tenantId)
      .single();

    const cfg = (tenant?.integration_configs as any)?.mycase;
    if (!cfg?.apiKeyId) {
      return new Response(JSON.stringify({ error: "MyCase not configured for this tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("id", cfg.apiKeyId)
      .single();

    const apiKey = keyRow?.key_hash;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "MyCase API key not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: AdapterConnectionContext = {
      connection_id: "",
      client_id: tenantId,
      organization_id: tenant?.organization_id ?? "",
      provider: "mycase",
      access_token: apiKey,
    };

    const { action, payload } = await req.json();

    let result: any;
    switch (action) {
      case "whoAmI":
        result = await mycaseAdapter.whoAmI(ctx);
        break;
      case "searchContacts":
        result = await mycaseAdapter.searchContact(ctx, payload);
        break;
      case "createContact":
        result = await mycaseAdapter.createContact(ctx, payload);
        break;
      case "searchCases":
      case "searchMatters":
        result = await mycaseAdapter.searchMatter(ctx, payload);
        break;
      case "createCase":
      case "createMatter":
        result = await mycaseAdapter.createMatter!(ctx, payload);
        break;
      case "createNote":
        result = await mycaseAdapter.createNote(ctx, payload);
        break;
      case "createTask":
        result = await mycaseAdapter.createTask!(ctx, payload);
        break;
      case "createActivity":
        result = await mycaseAdapter.createActivity!(ctx, payload);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(
      JSON.stringify({ success: result.ok, tenant_id: tenantId, action, ...result }),
      {
        status: result.ok ? 200 : result.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("MyCase adapter error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
