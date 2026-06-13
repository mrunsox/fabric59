// Clio deauthorization callback — Clio calls this when a user revokes access.
// We mark the connection as revoked, preserve the audit trail, and disable
// dependent webhook subscriptions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

async function verifyClioSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const normalizedSignature = signature.replace(/^sha256=/i, "").toLowerCase();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === normalizedSignature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown> = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }
    }
    // Clio sends client_id (their OAuth app id) and the user_id whose token was revoked.
    const clioUserId = String(payload.user_id ?? payload.client_id ?? "");
    if (!clioUserId) return jsonResponse({ error: "Missing user_id / client_id in deauth payload" }, 400);

    const { data: matches } = await supabase
      .from("legal_connect_connections")
      .select("id, organization_id, client_id, provider_account_id, metadata")
      .eq("provider", "clio")
      .eq("provider_account_id", clioUserId);

    if (!matches?.length) {
      return jsonResponse({ ok: true, connections_revoked: 0 });
    }

    const signature = req.headers.get("x-clio-signature") ?? req.headers.get("clio-signature") ?? "";
    const firstMetadata = (matches[0]?.metadata ?? {}) as Record<string, unknown>;
    const firstSecret = String(firstMetadata.webhook_secret ?? firstMetadata.shared_secret ?? payload.shared_secret ?? "");
    const signatureValid = await verifyClioSignature(rawBody, signature, firstSecret);

    if (!signatureValid) {
      await supabase.from("legal_connect_webhook_failures").insert({
        organization_id: matches[0]?.organization_id ?? null,
        endpoint: "clio-deauth-callback",
        reason: "invalid_clio_deauth_signature",
        ip_address: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
        payload_excerpt: rawBody.slice(0, 1000),
        signature_present: !!signature,
      });
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

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

    }

    return jsonResponse({ ok: true, connections_revoked: matches?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[clio-deauth-callback]", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
