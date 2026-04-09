import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const { action, ...payload } = await req.json();

    // Verify user belongs to the org they're trying to operate on
    if (payload.organization_id) {
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", payload.organization_id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Verify client_id belongs to the org
    if (payload.client_id && payload.organization_id) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("id", payload.client_id)
        .eq("organization_id", payload.organization_id)
        .maybeSingle();

      if (!tenant) {
        return new Response(JSON.stringify({ error: "Client does not belong to this organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let result: unknown;

    switch (action) {
      case "getConfig": {
        const { data, error } = await supabaseAdmin
          .from("legal_connect_tenant_configs")
          .select("id, organization_id, client_id, sandbox_mode, feature_flags, ai_preferences, billing_config, provider_overrides, onboarding_status, created_at, updated_at")
          .eq("organization_id", payload.organization_id)
          .eq("client_id", payload.client_id)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      case "upsertConfig": {
        const { data, error } = await supabaseAdmin
          .from("legal_connect_tenant_configs")
          .upsert(
            {
              organization_id: payload.organization_id,
              client_id: payload.client_id,
              sandbox_mode: payload.sandbox_mode ?? false,
              feature_flags: payload.feature_flags ?? {},
              ai_preferences: payload.ai_preferences ?? {},
              billing_config: payload.billing_config ?? {},
              provider_overrides: payload.provider_overrides ?? {},
              onboarding_status: payload.onboarding_status ?? "pending",
            },
            { onConflict: "organization_id,client_id" }
          )
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "getConnectionSafe": {
        // Return connection info without encrypted tokens
        const { data, error } = await supabaseAdmin
          .from("legal_connect_connections")
          .select("id, organization_id, client_id, provider, connection_name, status, auth_type, provider_account_id, provider_region, base_url, scopes, access_token_expires_at, refresh_token_expires_at, deauth_callback_enabled, last_connected_at, last_refreshed_at, last_error_at, last_error_message, is_sandbox, metadata, created_at, updated_at")
          .eq("id", payload.connection_id)
          .eq("organization_id", payload.organization_id)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      case "validateConnectionOwnership": {
        const { data, error } = await supabaseAdmin
          .from("legal_connect_connections")
          .select("id, client_id, provider, status")
          .eq("id", payload.connection_id)
          .eq("organization_id", payload.organization_id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return new Response(JSON.stringify({ error: "Connection not found or access denied" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Verify client_id matches if provided
        if (payload.client_id && data.client_id !== payload.client_id) {
          return new Response(JSON.stringify({ error: "Connection does not belong to this client" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        result = { valid: true, connection: data };
        break;
      }

      case "updateCapabilityOverrides": {
        const { data, error } = await supabaseAdmin
          .from("legal_connect_tenant_configs")
          .update({ provider_overrides: payload.overrides })
          .eq("organization_id", payload.organization_id)
          .eq("client_id", payload.client_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "toggleOutageMode": {
        const { data, error } = await supabaseAdmin
          .from("legal_connect_tenant_configs")
          .update({ outage_mode: payload.outage_mode ?? false })
          .eq("organization_id", payload.organization_id)
          .eq("client_id", payload.client_id)
          .select()
          .single();
        if (error) throw error;

        // If turning off outage mode, resume paused jobs
        if (!payload.outage_mode) {
          await supabaseAdmin
            .from("legal_connect_sync_jobs")
            .update({ status: "queued", next_attempt_at: new Date().toISOString() })
            .eq("organization_id", payload.organization_id)
            .eq("client_id", payload.client_id)
            .eq("status", "paused");
        }

        result = data;
        break;
      }

      case "getWebhookHealth": {
        const { data: subs, error } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("organization_id", payload.organization_id);
        if (error) throw error;

        // Get failure counts per subscription
        const { data: failures } = await supabaseAdmin
          .from("legal_connect_failure_classifications")
          .select("classification, created_at")
          .eq("organization_id", payload.organization_id)
          .in("classification", ["expired_subscription", "renewal_failed", "invalid_signature"])
          .order("created_at", { ascending: false })
          .limit(50);

        // Get dead letter count
        const { count: deadLetterCount } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", payload.organization_id)
          .eq("status", "dead_letter");

        // Get paused count (outage backlog)
        const { count: pausedCount } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", payload.organization_id)
          .eq("status", "paused");

        result = {
          subscriptions: subs ?? [],
          recentFailures: failures ?? [],
          deadLetterCount: deadLetterCount ?? 0,
          pausedCount: pausedCount ?? 0,
        };
        break;
      }

      case "renewWebhook": {
        // Manual renewal of a specific subscription
        const { data: sub, error: subErr } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("id", payload.subscription_id)
          .eq("organization_id", payload.organization_id)
          .single();
        if (subErr) throw subErr;

        // In production: call provider API to renew
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const newRenewAfter = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .update({
            expires_at: newExpiry,
            renew_after: newRenewAfter,
            status: "active",
            failure_count: 0,
          })
          .eq("id", payload.subscription_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
