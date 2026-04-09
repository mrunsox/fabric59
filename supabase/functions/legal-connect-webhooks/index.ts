import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-clio-signature, x-mycase-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Signature verification ──────────────────────────────────────────

async function verifyClio(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return expected === signature.toLowerCase();
  } catch {
    return false;
  }
}

async function verifyMyCase(payload: string, signature: string, secret: string): Promise<boolean> {
  // MyCase uses same HMAC-SHA256 pattern when available
  if (!signature || !secret) return false;
  return verifyClio(payload, signature, secret);
}

// ── Normalize event ──────────────────────────────────────────────────

function normalizeClioEvent(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    provider: "clio",
    entity_type: (raw.type as string)?.split(".")[0] ?? "unknown",
    action: (raw.type as string)?.split(".")[1] ?? "unknown",
    entity_id: String(raw.data && typeof raw.data === "object" && "id" in (raw.data as any) ? (raw.data as any).id : ""),
    raw_event_type: raw.type,
    timestamp: raw.timestamp ?? new Date().toISOString(),
  };
}

function normalizeMyCaseEvent(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    provider: "mycase",
    entity_type: (raw.event_type as string)?.split(".")[0] ?? "unknown",
    action: (raw.event_type as string)?.split(".")[1] ?? "unknown",
    entity_id: String(raw.resource_id ?? ""),
    raw_event_type: raw.event_type,
    timestamp: raw.created_at ?? new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Route: /legal-connect-webhooks/clio or /legal-connect-webhooks/mycase
    const provider = pathParts[pathParts.length - 1]?.toLowerCase() ?? "";

    if (!["clio", "mycase"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Unknown provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract routing headers
    const clientId = req.headers.get("x-client-id") ?? (payload.client_id as string) ?? null;
    const orgId = req.headers.get("x-org-id") ?? (payload.organization_id as string) ?? null;

    if (!clientId || !orgId) {
      return new Response(JSON.stringify({ error: "Missing client_id or organization_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up webhook subscription for signature verification
    const { data: subscription } = await supabaseAdmin
      .from("legal_connect_webhook_subscriptions")
      .select("id, webhook_secret_ref, status, expires_at")
      .eq("organization_id", orgId)
      .eq("client_id", clientId)
      .eq("provider", provider)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Signature verification
    const rawHeaders: Record<string, string> = {};
    req.headers.forEach((v, k) => { rawHeaders[k] = v; });

    let signatureValid: boolean | null = null;

    if (provider === "clio") {
      const sig = req.headers.get("x-clio-signature") ?? "";
      const secret = subscription?.webhook_secret_ref ?? "";
      if (sig && secret) {
        signatureValid = await verifyClio(rawBody, sig, secret);
      } else if (sig && !secret) {
        signatureValid = false; // signature provided but no secret configured
      }
    } else if (provider === "mycase") {
      const sig = req.headers.get("x-mycase-signature") ?? "";
      const secret = subscription?.webhook_secret_ref ?? "";
      if (sig && secret) {
        signatureValid = await verifyMyCase(rawBody, sig, secret);
      }
    }

    // Reject invalid signatures
    if (signatureValid === false) {
      // Log the security incident
      await supabaseAdmin.from("legal_connect_failure_classifications").insert({
        organization_id: orgId,
        client_id: clientId,
        classification: "invalid_signature",
        is_retryable: false,
        notes: `Invalid ${provider} webhook signature rejected`,
      });

      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize event
    const normalized = provider === "clio"
      ? normalizeClioEvent(payload)
      : normalizeMyCaseEvent(payload);

    // Generate event key for idempotency
    const eventKey = `${provider}:${normalized.entity_type}:${normalized.action}:${normalized.entity_id}:${normalized.timestamp}`;

    // Idempotency check
    const { data: existing } = await supabaseAdmin
      .from("legal_connect_event_log")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (existing) {
      // Log duplicate
      await supabaseAdmin.from("legal_connect_failure_classifications").insert({
        organization_id: orgId,
        client_id: clientId,
        event_log_id: existing.id,
        classification: "duplicate_event",
        is_retryable: false,
        notes: `Duplicate event: ${eventKey}`,
      });

      return new Response(JSON.stringify({ status: "duplicate", event_key: eventKey }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist raw event to event log
    const correlationId = crypto.randomUUID();
    const { data: eventLog, error: logError } = await supabaseAdmin
      .from("legal_connect_event_log")
      .insert({
        organization_id: orgId,
        client_id: clientId,
        provider,
        direction: "inbound",
        source_type: "webhook",
        source_event_type: String(normalized.raw_event_type ?? "unknown"),
        event_key: eventKey,
        correlation_id: correlationId,
        payload: payload,
        normalized_payload: normalized,
        processing_status: "received",
        signature_valid: signatureValid,
        raw_headers: rawHeaders,
      })
      .select("id")
      .single();

    if (logError) throw logError;

    // Check outage mode
    const { data: tenantConfig } = await supabaseAdmin
      .from("legal_connect_tenant_configs")
      .select("outage_mode")
      .eq("organization_id", orgId)
      .eq("client_id", clientId)
      .maybeSingle();

    const isOutage = tenantConfig?.outage_mode ?? false;

    // Create sync job
    const { error: jobError } = await supabaseAdmin
      .from("legal_connect_sync_jobs")
      .insert({
        organization_id: orgId,
        client_id: clientId,
        provider,
        job_type: `${normalized.entity_type}.${normalized.action}`,
        direction: "inbound",
        priority: isOutage ? 200 : 100, // lower priority during outage
        idempotency_key: eventKey,
        correlation_id: correlationId,
        source_event_log_id: eventLog.id,
        status: isOutage ? "paused" : "queued",
        input_payload: { raw: payload, normalized },
        next_attempt_at: isOutage ? null : new Date().toISOString(),
      });

    if (jobError) throw jobError;

    // Update event log status
    await supabaseAdmin
      .from("legal_connect_event_log")
      .update({ processing_status: isOutage ? "paused" : "queued" })
      .eq("id", eventLog.id);

    // Update last_delivery_at on subscription
    if (subscription) {
      await supabaseAdmin
        .from("legal_connect_webhook_subscriptions")
        .update({ last_delivery_at: new Date().toISOString() })
        .eq("id", subscription.id);
    }

    return new Response(JSON.stringify({
      status: "accepted",
      correlation_id: correlationId,
      event_log_id: eventLog.id,
      outage_mode: isOutage,
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Webhook processing error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
