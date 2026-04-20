// Clio token refresh — cron-driven, refreshes connections expiring within 30 min.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

async function refreshClioToken(refreshToken: string): Promise<
  | { ok: true; access_token: string; refresh_token: string; expires_at: string }
  | { ok: false; error: string }
> {
  const clientId = Deno.env.get("CLIO_CLIENT_ID");
  const clientSecret = Deno.env.get("CLIO_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { ok: false, error: "Clio OAuth secrets not configured" };
  if (!refreshToken) return { ok: false, error: "no refresh token on connection" };

  const res = await fetch("https://app.clio.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, error: `clio refresh failed: ${txt}` };
  }
  const tokens = await res.json();
  return {
    ok: true,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? refreshToken,
    expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from("legal_connect_connections")
    .select("*")
    .eq("provider", "clio")
    .eq("status", "connected")
    .lt("access_token_expires_at", cutoff);

  if (error) return jsonResponse({ error: error.message }, 500);

  const results: Array<{ connection_id: string; ok: boolean; error?: string }> = [];

  for (const conn of connections ?? []) {
    try {
      const refreshed = await refreshClioToken(conn.encrypted_refresh_token);
      if (refreshed.ok) {
        await supabase
          .from("legal_connect_connections")
          .update({
            encrypted_access_token: refreshed.access_token,
            encrypted_refresh_token: refreshed.refresh_token,
            access_token_expires_at: refreshed.expires_at,
            last_refreshed_at: new Date().toISOString(),
            status: "connected",
            last_error_at: null,
            last_error_message: null,
          })
          .eq("id", conn.id);
        results.push({ connection_id: conn.id, ok: true });
      } else {
        await supabase
          .from("legal_connect_connections")
          .update({
            status: "expired",
            last_error_at: new Date().toISOString(),
            last_error_message: refreshed.error,
          })
          .eq("id", conn.id);
        results.push({ connection_id: conn.id, ok: false, error: refreshed.error });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push({ connection_id: conn.id, ok: false, error: msg });
    }
  }

  return jsonResponse({ refreshed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});
