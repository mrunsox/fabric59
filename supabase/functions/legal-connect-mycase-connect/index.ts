// Legal Connect — MyCase API-key based connect.
// Validates a per-client MyCase API key by hitting a lightweight live endpoint,
// then upserts a row in legal_connect_connections. The key is stored in
// encrypted_access_token following the existing project convention for
// *_encrypted columns. Never logged. Never returned to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MYCASE_BASE_URL = "https://api.mycase.com/v2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "auth_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "auth_invalid" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const clientId = String(body?.client_id ?? "");
  const apiKey = String(body?.api_key ?? "").trim();
  const accountLabel = body?.account_label ? String(body.account_label).slice(0, 120) : null;

  if (!clientId || !apiKey) return json({ error: "client_id, api_key required" }, 400);
  if (apiKey.length < 16) return json({ error: "api_key looks invalid" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: tenant } = await admin
    .from("tenants").select("id, organization_id").eq("id", clientId).maybeSingle();
  if (!tenant) return json({ error: "client_not_found" }, 404);

  const { data: membership } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenant.organization_id)
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (!membership) return json({ error: "forbidden" }, 403);

  // Validate the key against MyCase by hitting a lightweight endpoint.
  // /users/me is the canonical "who am I" call; if 401/403 it's invalid.
  let probeStatus = 0;
  let probeBody: any = null;
  try {
    const res = await fetch(`${MYCASE_BASE_URL}/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    probeStatus = res.status;
    probeBody = await res.json().catch(() => null);
  } catch (e) {
    return json({ success: false, error: "mycase_unreachable", message: (e as Error).message }, 502);
  }

  if (probeStatus === 401 || probeStatus === 403) {
    await admin.from("legal_connect_connections").upsert(
      {
        organization_id: tenant.organization_id,
        client_id: clientId,
        provider: "mycase",
        status: "error",
        auth_type: "api_key",
        last_error_at: new Date().toISOString(),
        last_error_message: `mycase rejected api key (HTTP ${probeStatus})`,
      },
      { onConflict: "client_id,provider" },
    );
    return json({ success: false, error: "mycase_auth_failed", message: "MyCase rejected the API key" }, 400);
  }
  if (probeStatus < 200 || probeStatus >= 300) {
    return json({ success: false, error: "mycase_probe_failed", message: `HTTP ${probeStatus}` }, 502);
  }

  const accountId = probeBody?.id ? String(probeBody.id) : (probeBody?.user?.id ? String(probeBody.user.id) : null);

  const { error: upsertErr } = await admin.from("legal_connect_connections").upsert(
    {
      organization_id: tenant.organization_id,
      client_id: clientId,
      provider: "mycase",
      status: "connected",
      auth_type: "api_key",
      provider_account_id: accountId,
      base_url: MYCASE_BASE_URL,
      encrypted_access_token: apiKey,
      metadata: accountLabel ? { account_label: accountLabel } : {},
      last_connected_at: new Date().toISOString(),
      last_error_at: null,
      last_error_message: null,
    },
    { onConflict: "client_id,provider" },
  );

  if (upsertErr) {
    console.error("mycase connect upsert failed", upsertErr.message);
    return json({ success: false, error: "persist_failed" }, 500);
  }

  return json({ success: true, status: "connected", account_id: accountId });
});
