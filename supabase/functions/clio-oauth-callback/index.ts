// Clio OAuth callback — opaque-state version. Validates the state token,
// exchanges the code for tokens server-side, and writes an upsert into
// legal_connect_connections. Tokens are stored in the existing *_encrypted
// columns following project convention. The user is redirected back into
// the app with success/error query params.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function appBase() {
  return Deno.env.get("SITE_URL") || "https://fabric59.lovable.app";
}

function redirect(target: string) {
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: target } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  if (errParam) {
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=${encodeURIComponent(errParam)}`);
  }
  if (!code || !state) {
    return new Response(JSON.stringify({ error: "missing code or state" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up + delete state token (one-time use)
  const { data: stateRow, error: stateErr } = await supabase
    .from("legal_connect_oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();
  if (stateErr || !stateRow) {
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=invalid_state`);
  }
  await supabase.from("legal_connect_oauth_states").delete().eq("state", state);
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=state_expired`);
  }

  const clioClientId = Deno.env.get("CLIO_CLIENT_ID");
  const clioClientSecret = Deno.env.get("CLIO_CLIENT_SECRET");
  const clioRegion = Deno.env.get("CLIO_REGION") || "app.clio.com";
  if (!clioClientId || !clioClientSecret) {
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=not_configured`);
  }

  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/clio-oauth-callback`;
  const tokenRes = await fetch(`https://${clioRegion}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clioClientId,
      client_secret: clioClientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error("Clio token exchange failed", tokenRes.status, detail.slice(0, 200));
    await supabase.from("legal_connect_connections").upsert(
      {
        organization_id: stateRow.organization_id,
        client_id: stateRow.client_id,
        provider: "clio",
        status: "error",
        auth_type: "oauth2",
        last_error_at: new Date().toISOString(),
        last_error_message: `token_exchange_failed (${tokenRes.status})`,
      },
      { onConflict: "client_id,provider" },
    );
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  const { error: upsertErr } = await supabase.from("legal_connect_connections").upsert(
    {
      organization_id: stateRow.organization_id,
      client_id: stateRow.client_id,
      provider: "clio",
      status: "connected",
      auth_type: "oauth2",
      provider_region: clioRegion,
      base_url: `https://${clioRegion}/api/v4`,
      scopes: typeof tokenData.scope === "string" ? tokenData.scope.split(/\s+/) : [],
      encrypted_access_token: tokenData.access_token,
      encrypted_refresh_token: tokenData.refresh_token,
      access_token_expires_at: expiresAt,
      last_connected_at: new Date().toISOString(),
      last_refreshed_at: new Date().toISOString(),
      last_error_at: null,
      last_error_message: null,
    },
    { onConflict: "client_id,provider" },
  );

  if (upsertErr) {
    console.error("clio connection upsert failed", upsertErr.message);
    return redirect(`${appBase()}/admin/legal-connect?clio=error&reason=persist_failed`);
  }

  const target = stateRow.redirect_after
    || `${appBase()}/admin/clients/${stateRow.client_id}/legal-connect?clio=connected`;
  return redirect(target);
});
