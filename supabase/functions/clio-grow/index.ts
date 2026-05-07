// Clio Grow adapter — Lead Inbox API.
//
// Auth model (Phase 1): inbox_lead_token, supplied per client through
// ClioGrowConnectWizard and stored on legal_connect_connections.metadata.
// No OAuth refresh; the token is long-lived per Grow inbox.
//
// Endpoint: POST https://grow.clio.com/inbox_leads
// Body shape (documented):
//   {
//     "inbox_lead": {
//       "from_first":     "...",
//       "from_last":      "...",
//       "from_email":     "...",
//       "from_phone":     "...",
//       "from_message":   "...",
//       "referring_url":  "...",
//       "from_source":    "..."
//     },
//     "inbox_lead_token": "<token>"
//   }
//
// Two callable surfaces:
//   POST /clio-grow            — internal action dispatch from legal-connect-jobs
//                                body: { action: "createLead", connection_id, lead: {...} }
//   POST /clio-grow/test       — wizard "Test connection": body: { inbox_lead_token }
//                                fires a non-destructive lead with from_source="fabric59:test".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROW_INBOX_URL = "https://grow.clio.com/inbox_leads";

interface NormalizedGrowLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  referring_url?: string;
  source?: string;
}

interface AdapterResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  retryable?: boolean;
}

function buildGrowPayload(lead: NormalizedGrowLead, token: string) {
  return {
    inbox_lead: {
      from_first: lead.first_name ?? "",
      from_last: lead.last_name ?? "",
      from_email: lead.email ?? "",
      from_phone: lead.phone ?? "",
      from_message: lead.message ?? "",
      referring_url: lead.referring_url ?? "",
      from_source: lead.source ?? "Fabric59 / Five9",
    },
    inbox_lead_token: token,
  };
}

function validateLead(lead: NormalizedGrowLead): string | null {
  // Grow requires at least a name + one contact method to accept the lead.
  const hasName = Boolean((lead.first_name ?? "").trim() || (lead.last_name ?? "").trim());
  const hasContact = Boolean((lead.email ?? "").trim() || (lead.phone ?? "").trim());
  if (!hasName) return "missing required field: first_name or last_name";
  if (!hasContact) return "missing required field: email or phone";
  return null;
}

async function postLead(token: string, lead: NormalizedGrowLead): Promise<AdapterResult> {
  const validationError = validateLead(lead);
  if (validationError) {
    return { ok: false, status: 400, error: `validation: ${validationError}`, retryable: false };
  }
  const body = buildGrowPayload(lead, token);
  try {
    const res = await fetch(GROW_INBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    let parsed: unknown = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `clio_grow ${res.status}: ${text.slice(0, 500)}`,
        retryable: res.status === 429 || res.status >= 500,
        data: parsed ?? undefined,
      };
    }
    return { ok: true, status: res.status, data: parsed ?? {} };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: `network: ${(e as Error).message}`,
      retryable: true,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/clio-grow\/?/, "/");

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── /test : wizard connection test ────────────────────────────────────
  if (path === "/test" || payload.action === "test") {
    const token = (payload.inbox_lead_token ?? "").trim();
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "missing inbox_lead_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Grow has no whoAmI endpoint. We POST a clearly-marked test lead.
    // Callers should use a sandbox/test inbox if they don't want it on the real pipeline.
    const result = await postLead(token, {
      first_name: "Fabric59",
      last_name: "Connection Test",
      email: "noreply+fabric59-test@example.com",
      message: "Fabric59 connection test — safe to delete.",
      source: "fabric59:test",
    });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : result.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── action dispatch from job runner ───────────────────────────────────
  const action = payload.action as string | undefined;
  if (action !== "createLead") {
    return new Response(
      JSON.stringify({ ok: false, status: 501, error: `unsupported: ${action ?? "<missing>"}` }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const connectionId = payload.connection_id as string | undefined;
  if (!connectionId) {
    return new Response(JSON.stringify({ ok: false, error: "missing connection_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: conn, error: connErr } = await supabaseAdmin
    .from("legal_connect_connections")
    .select("id, provider, status, metadata")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr || !conn) {
    return new Response(JSON.stringify({ ok: false, error: "connection_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (conn.provider !== "clio_grow") {
    return new Response(JSON.stringify({ ok: false, error: "wrong_provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = (conn.metadata as any)?.inbox_lead_token as string | undefined;
  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, error: "no_inbox_lead_token_on_connection" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const lead = (payload.lead ?? {}) as NormalizedGrowLead;
  const result = await postLead(token, lead);

  // Update connection health pointers
  await supabaseAdmin
    .from("legal_connect_connections")
    .update(
      result.ok
        ? { last_connected_at: new Date().toISOString(), last_error_at: null, last_error_message: null }
        : { last_error_at: new Date().toISOString(), last_error_message: result.error?.slice(0, 500) },
    )
    .eq("id", connectionId);

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : result.status || 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
