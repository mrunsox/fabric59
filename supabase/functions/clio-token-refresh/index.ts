// Clio token refresh — cron-driven, refreshes connections expiring within 30 min.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { clioAdapter } from "../clio/index.ts";
import type { AdapterConnectionContext } from "../_shared/legal-crm-adapter.ts";

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
    const ctx: AdapterConnectionContext = {
      connection_id: conn.id,
      client_id: conn.client_id,
      organization_id: conn.organization_id,
      provider: "clio",
      access_token: conn.encrypted_access_token,
      refresh_token: conn.encrypted_refresh_token,
    };
    try {
      const refreshed = await clioAdapter.refreshToken!(ctx);
      if (refreshed.ok && refreshed.data) {
        await supabase
          .from("legal_connect_connections")
          .update({
            encrypted_access_token: refreshed.data.access_token,
            encrypted_refresh_token: refreshed.data.refresh_token,
            access_token_expires_at: refreshed.data.expires_at,
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
            last_error_message: refreshed.error ?? "refresh failed",
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
