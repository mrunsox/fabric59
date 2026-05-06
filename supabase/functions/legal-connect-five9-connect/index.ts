// Legal Connect — Five9 credential-based connect.
// Verifies submitted Five9 admin credentials via SOAP getContactFields,
// then upserts a row in legal_connect_connections. Credentials are sent
// to Five9 only; the password is stored in encrypted_access_token following
// the existing project convention for *_encrypted columns. The password is
// never logged and never returned to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOAP_ENDPOINT = "https://api.five9.com/wsadmin/v13/AdminWebService";

const SOAP_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body><ser:getContactFields/></soapenv:Body>
</soapenv:Envelope>`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "auth_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Identify caller
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "auth_invalid" }, 401);
  const userId = userRes.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const clientId = String(body?.client_id ?? "");
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const baseUrl = body?.base_url ? String(body.base_url) : null;

  if (!clientId || !username || !password) {
    return json({ error: "client_id, username, password required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve org and verify membership
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id, organization_id")
    .eq("id", clientId)
    .maybeSingle();
  if (tenantErr || !tenant) return json({ error: "client_not_found" }, 404);

  const { data: membership } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenant.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return json({ error: "forbidden" }, 403);

  // Verify credentials against Five9 SOAP endpoint
  const basic = btoa(`${username}:${password}`);
  let soapStatus = 0;
  let soapText = "";
  try {
    const res = await fetch(SOAP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Authorization: `Basic ${basic}`,
        SOAPAction: "",
      },
      body: SOAP_BODY,
    });
    soapStatus = res.status;
    soapText = await res.text();
  } catch (e) {
    return json({ success: false, error: "five9_unreachable", message: (e as Error).message }, 502);
  }

  const ok = soapStatus === 200 && !/soap:Fault|<faultstring>/i.test(soapText);
  if (!ok) {
    // Surface Five9's faultstring if present, scrubbed of envelope noise.
    const m = soapText.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
    const detail = m?.[1]?.trim() || `Five9 returned HTTP ${soapStatus}`;
    // Persist the failure on the connection row so it surfaces in the UI.
    await admin
      .from("legal_connect_connections")
      .upsert(
        {
          organization_id: tenant.organization_id,
          client_id: clientId,
          provider: "five9",
          status: "error",
          auth_type: "credentials",
          provider_account_id: username,
          last_error_at: new Date().toISOString(),
          last_error_message: detail.slice(0, 500),
        },
        { onConflict: "client_id,provider" },
      );
    return json({ success: false, error: "five9_auth_failed", message: detail }, 400);
  }

  // Upsert success row. Note: stored under encrypted_access_token to match
  // existing project convention for *_encrypted columns. See follow-up note
  // in implementation report — at-rest encryption is a follow-up across all
  // *_encrypted columns project-wide.
  const { error: upsertErr } = await admin
    .from("legal_connect_connections")
    .upsert(
      {
        organization_id: tenant.organization_id,
        client_id: clientId,
        provider: "five9",
        status: "connected",
        auth_type: "credentials",
        provider_account_id: username,
        base_url: baseUrl,
        encrypted_access_token: password,
        last_connected_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
      },
      { onConflict: "client_id,provider" },
    );

  if (upsertErr) {
    console.error("five9 connect upsert failed", upsertErr.message);
    return json({ success: false, error: "persist_failed" }, 500);
  }

  return json({ success: true, status: "connected", username });
});
