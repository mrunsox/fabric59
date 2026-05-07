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
//       "from_first":     "...",  // required
//       "from_last":      "...",  // required
//       "from_message":   "...",  // required
//       "referring_url":  "...",  // required
//       "from_source":    "...",  // required
//       "from_email":     "...",  // optional
//       "from_phone":     "..."   // optional
//     },
//     "inbox_lead_token": "<token>"
//   }
//
// Two callable surfaces:
//   POST /clio-grow            — internal action dispatch from legal-connect-jobs
//                                body: { action: "createLead", connection_id, lead: {...} }
//   POST /clio-grow            — wizard "Test connection": body: { action: "test", inbox_lead_token }
//                                fires a non-destructive lead with from_source="fabric59:test".
//
// Hardening notes (Phase 1.1):
//   - Hard 15s request timeout via AbortController
//   - Failure classification: validation (4xx, non-retryable),
//     auth/forbidden (4xx, non-retryable), upstream 5xx + 429 (retryable),
//     network/timeout (retryable)
//   - Safe logging only — token is never echoed
//   - Connection health pointers updated on every dispatch

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROW_INBOX_URL = "https://grow.clio.com/inbox_leads";
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_REFERRING_URL = "https://fabric59.app/five9";

interface NormalizedGrowLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  referring_url?: string;
  source?: string;
}

type FailureKind =
  | "validation"
  | "auth"
  | "rate_limited"
  | "upstream_5xx"
  | "upstream_4xx"
  | "network"
  | "timeout";

interface AdapterResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  failure_kind?: FailureKind;
  retryable?: boolean;
}

function buildGrowPayload(lead: NormalizedGrowLead, token: string) {
  return {
    inbox_lead: {
      from_first: (lead.first_name ?? "").trim(),
      from_last: (lead.last_name ?? "").trim(),
      from_email: (lead.email ?? "").trim(),
      from_phone: (lead.phone ?? "").trim(),
      from_message: (lead.message ?? "").trim() || "Lead captured via Five9 call.",
      referring_url: (lead.referring_url ?? "").trim() || DEFAULT_REFERRING_URL,
      from_source: (lead.source ?? "").trim() || "Fabric59 / Five9",
    },
    inbox_lead_token: token,
  };
}

/** Validate against documented Grow Lead Inbox required fields. */
function validateLead(lead: NormalizedGrowLead): string | null {
  const first = (lead.first_name ?? "").trim();
  const last = (lead.last_name ?? "").trim();
  const email = (lead.email ?? "").trim();
  const phone = (lead.phone ?? "").trim();

  if (!first) return "missing required field: first_name";
  if (!last) return "missing required field: last_name";
  // Grow accepts a lead without email/phone if a message+source exists,
  // but Fabric59 requires at least one contact method to be useful downstream.
  if (!email && !phone) return "missing required field: email or phone";
  return null;
}

/** Strip noisy/large content for log storage; never include the token. */
function safeErrorSnippet(text: string): string {
  return text.replace(/inbox_lead_token=[^&\s"']+/gi, "inbox_lead_token=***").slice(0, 500);
}

async function postLead(token: string, lead: NormalizedGrowLead): Promise<AdapterResult> {
  const validationError = validateLead(lead);
  if (validationError) {
    return {
      ok: false,
      status: 400,
      error: `validation: ${validationError}`,
      failure_kind: "validation",
      retryable: false,
    };
  }
  const body = buildGrowPayload(lead, token);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(GROW_INBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let parsed: unknown = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }

    if (res.ok) {
      return { ok: true, status: res.status, data: parsed ?? {} };
    }

    // Classify failure
    let kind: FailureKind = "upstream_4xx";
    let retryable = false;
    if (res.status === 401 || res.status === 403) {
      kind = "auth";
      retryable = false;
    } else if (res.status === 429) {
      kind = "rate_limited";
      retryable = true;
    } else if (res.status >= 500) {
      kind = "upstream_5xx";
      retryable = true;
    } else if (res.status === 400 || res.status === 422) {
      kind = "validation";
      retryable = false;
    }

    return {
      ok: false,
      status: res.status,
      error: `clio_grow ${res.status}: ${safeErrorSnippet(text)}`,
      failure_kind: kind,
      retryable,
      data: parsed ?? undefined,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    const err = e as Error;
    if (err.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        error: `timeout after ${REQUEST_TIMEOUT_MS}ms`,
        failure_kind: "timeout",
        retryable: true,
      };
    }
    return {
      ok: false,
      status: 0,
      error: `network: ${err.message}`,
      failure_kind: "network",
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
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── /test : wizard connection test ────────────────────────────────────
  if (path === "/test" || payload.action === "test") {
    const token = (payload.inbox_lead_token ?? "").trim();
    if (!token) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "missing inbox_lead_token",
          failure_kind: "validation",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Grow has no whoAmI endpoint. We POST a clearly-marked test lead.
    const result = await postLead(token, {
      first_name: "Fabric59",
      last_name: "Connection Test",
      email: "noreply+fabric59-test@example.com",
      message: "Fabric59 connection test — safe to delete.",
      referring_url: DEFAULT_REFERRING_URL,
      source: "fabric59:test",
    });
    console.log("[clio-grow] test:", {
      ok: result.ok,
      status: result.status,
      failure_kind: result.failure_kind,
    });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : result.status || 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── action dispatch from job runner ───────────────────────────────────
  const action = payload.action as string | undefined;
  if (action !== "createLead") {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 501,
        error: `unsupported: ${action ?? "<missing>"}`,
        failure_kind: "validation",
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const connectionId = payload.connection_id as string | undefined;
  if (!connectionId) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing connection_id", failure_kind: "validation" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: conn, error: connErr } = await supabaseAdmin
    .from("legal_connect_connections")
    .select("id, provider, status, metadata")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr || !conn) {
    return new Response(
      JSON.stringify({ ok: false, error: "connection_not_found", failure_kind: "validation" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (conn.provider !== "clio_grow") {
    return new Response(
      JSON.stringify({ ok: false, error: "wrong_provider", failure_kind: "validation" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const token = (conn.metadata as any)?.inbox_lead_token as string | undefined;
  if (!token) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "no_inbox_lead_token_on_connection",
        failure_kind: "validation",
      }),
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
        ? {
            last_connected_at: new Date().toISOString(),
            last_error_at: null,
            last_error_message: null,
          }
        : {
            last_error_at: new Date().toISOString(),
            last_error_message: (result.error ?? "unknown error").slice(0, 500),
          },
    )
    .eq("id", connectionId);

  console.log("[clio-grow] dispatch:", {
    connection_id: connectionId,
    ok: result.ok,
    status: result.status,
    failure_kind: result.failure_kind,
    retryable: result.retryable,
  });

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : result.status || 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
