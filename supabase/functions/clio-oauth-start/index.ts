// Legal Connect — Clio OAuth start.
// Validates caller, builds an opaque state token, persists it, and returns
// the authorize URL. If Clio secrets are missing, returns configured:false
// so the UI can render its disabled state. Never returns secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SCOPES = "matters contacts communications activities";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomState() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const clioClientId = Deno.env.get("CLIO_CLIENT_ID");
  const clioRegion = Deno.env.get("CLIO_REGION") || "app.clio.com";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const dryRun = body?.dry_run === true;

  if (!clioClientId) {
    return json({
      configured: false,
      reason: "CLIO_CLIENT_ID is not set. Configure Clio OAuth credentials before enabling this provider.",
    });
  }
  if (dryRun) return json({ configured: true });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "auth_required" }, 401);

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "auth_invalid" }, 401);

  const clientId = String(body?.client_id ?? "");
  const redirectAfter = body?.redirect_after ? String(body.redirect_after) : null;
  if (!clientId) return json({ error: "client_id required" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

  const state = randomState();
  const { error: stateErr } = await admin.from("legal_connect_oauth_states").insert({
    state,
    provider: "clio",
    client_id: clientId,
    organization_id: tenant.organization_id,
    user_id: userRes.user.id,
    redirect_after: redirectAfter,
  });
  if (stateErr) {
    console.error("oauth state insert failed", stateErr.message);
    return json({ error: "state_persist_failed" }, 500);
  }

  const redirectUri = `${supabaseUrl}/functions/v1/clio-oauth-callback`;
  const url = new URL(`https://${clioRegion}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clioClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", DEFAULT_SCOPES);
  url.searchParams.set("state", state);

  return json({ configured: true, url: url.toString() });
});
