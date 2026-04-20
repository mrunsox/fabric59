// Clio deauthorization callback — Clio calls this when a user revokes access.
// We mark the connection as revoked, preserve the audit trail, and disable
// dependent webhook subscriptions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    // Clio sends client_id (their OAuth app id) and the user_id whose token was revoked.
    const clioUserId = String(payload.user_id ?? payload.client_id ?? "");
    if (!clioUserId) return jsonResponse({ error: "Missing user_id / client_id in deauth payload" }, 400);

    const { data: matches } = await supabase
      .from("legal_connect_connections")
      .select("*")
      .eq("provider", "clio")
      .eq("provider_account_id", clioUserId);

    for (const conn of matches ?? []) {
      await supabase
        .from("legal_connect_connections")
        .update({
          status: "revoked",
          encrypted_access_token: null,
          encrypted_refresh_token: null,
          last_error_at: new Date().toISOString(),
          last_error_message: "Clio user revoked authorization",
        })
        .eq("id", conn.id);

      // Disable webhook subscriptions tied to this connection
      await supabase
        .from("legal_connect_webhook_subscriptions")
        .update({ status: "disabled" })
        .eq("connection_id", conn.id);

      // Audit log entry
      await supabase.from("legal_connect_audit_log").insert({
        organization_id: conn.organization_id,
        client_id: conn.client_id,
        provider: "clio",
        action: "deauthorization_received",
        actor: "clio_callback",
        details: { connection_id: conn.id, payload },
      }).select();
    }

    return jsonResponse({ ok: true, connections_revoked: matches?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[clio-deauth-callback]", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
