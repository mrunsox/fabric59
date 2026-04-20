// Smokeball OAuth callback — exchanges code for tokens, captures region.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const REGION_TOKEN_URLS: Record<string, string> = {
  AU: "https://api.smokeball.com.au/oauth/token",
  US: "https://api.smokeball.com/oauth/token",
  UK: "https://api.smokeball.co.uk/oauth/token",
};

const REGION_BASE_URLS: Record<string, string> = {
  AU: "https://api.smokeball.com.au/v2",
  US: "https://api.smokeball.com/v2",
  UK: "https://api.smokeball.co.uk/v2",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return jsonResponse({ error: "Missing code or state" }, 400);

    let stateData: { tenantId: string; organizationId: string; region: string; redirectUrl?: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return jsonResponse({ error: "Invalid state parameter" }, 400);
    }

    const region = (stateData.region ?? "US").toUpperCase();
    const clientId = Deno.env.get("SMOKEBALL_CLIENT_ID");
    const clientSecret = Deno.env.get("SMOKEBALL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return jsonResponse({ error: "Smokeball OAuth credentials not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const redirectUri = `${supabaseUrl}/functions/v1/smokeball-oauth-callback`;

    const tokenUrl = REGION_TOKEN_URLS[region] ?? REGION_TOKEN_URLS.US;
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Smokeball token exchange failed:", errBody);
      return jsonResponse({ error: "Token exchange failed", details: errBody }, 500);
    }
    const tokenData = await tokenRes.json();
    const baseUrl = REGION_BASE_URLS[region];
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();

    // Upsert connection
    const { data: existing } = await supabase
      .from("legal_connect_connections")
      .select("id")
      .eq("client_id", stateData.tenantId)
      .eq("provider", "smokeball")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("legal_connect_connections")
        .update({
          status: "connected",
          encrypted_access_token: tokenData.access_token,
          encrypted_refresh_token: tokenData.refresh_token,
          access_token_expires_at: expiresAt,
          provider_region: region,
          base_url: baseUrl,
          auth_type: "oauth2",
          last_connected_at: new Date().toISOString(),
          last_error_at: null,
          last_error_message: null,
          scopes: tokenData.scope ? [tokenData.scope] : [],
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("legal_connect_connections").insert({
        organization_id: stateData.organizationId,
        client_id: stateData.tenantId,
        provider: "smokeball",
        status: "connected",
        auth_type: "oauth2",
        encrypted_access_token: tokenData.access_token,
        encrypted_refresh_token: tokenData.refresh_token,
        access_token_expires_at: expiresAt,
        provider_region: region,
        base_url: baseUrl,
        last_connected_at: new Date().toISOString(),
        scopes: tokenData.scope ? [tokenData.scope] : [],
      });
    }

    const redirectUrl = stateData.redirectUrl
      ?? `${Deno.env.get("SITE_URL") ?? "https://fabric59.lovable.app"}/admin/legal-connect?smokeball_connected=true`;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[smokeball-oauth-callback]", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
