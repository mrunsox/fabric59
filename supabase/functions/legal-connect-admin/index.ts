import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Clio webhook limits: max 31 days, default 3 days if omitted
const CLIO_MAX_WEBHOOK_DAYS = 31;
const CLIO_RENEW_THRESHOLD_DAYS = 25;

function makeSupabaseClients(authHeader: string) {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  return { supabaseAdmin, supabaseUser };
}

async function logRenewalAction(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    subscription_id: string;
    organization_id: string;
    client_id: string;
    action: string;
    previous_expires_at?: string | null;
    new_expires_at?: string | null;
    success: boolean;
    error_message?: string;
  }
) {
  await supabaseAdmin.from("legal_connect_webhook_renewal_log").insert({
    subscription_id: params.subscription_id,
    organization_id: params.organization_id,
    client_id: params.client_id,
    action: params.action,
    previous_expires_at: params.previous_expires_at,
    new_expires_at: params.new_expires_at,
    success: params.success,
    error_message: params.error_message,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { supabaseAdmin, supabaseUser } = makeSupabaseClients(authHeader);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const { action, ...payload } = await req.json();

    // Verify org membership
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

    // Verify client belongs to org
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

        const { data: failures } = await supabaseAdmin
          .from("legal_connect_failure_classifications")
          .select("classification, created_at")
          .eq("organization_id", payload.organization_id)
          .in("classification", ["expired_subscription", "renewal_failed", "invalid_signature"])
          .order("created_at", { ascending: false })
          .limit(50);

        const { count: deadLetterCount } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", payload.organization_id)
          .eq("status", "dead_letter");

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
        const { data: sub, error: subErr } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("id", payload.subscription_id)
          .eq("organization_id", payload.organization_id)
          .single();
        if (subErr) throw subErr;

        const previousExpiry = sub.expires_at;
        // Clio 31-day max, renew at 25-day threshold
        const newExpiry = new Date(Date.now() + CLIO_MAX_WEBHOOK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const newRenewAfter = new Date(Date.now() + CLIO_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

        try {
          // In production: call Clio PUT /webhooks/{id} with new expires_at
          const { data, error } = await supabaseAdmin
            .from("legal_connect_webhook_subscriptions")
            .update({
              expires_at: newExpiry,
              renew_after: newRenewAfter,
              status: "active",
              health_status: "healthy",
              failure_count: 0,
            })
            .eq("id", payload.subscription_id)
            .select()
            .single();
          if (error) throw error;

          await logRenewalAction(supabaseAdmin, {
            subscription_id: sub.id,
            organization_id: sub.organization_id,
            client_id: sub.client_id,
            action: "renew",
            previous_expires_at: previousExpiry,
            new_expires_at: newExpiry,
            success: true,
          });

          result = data;
        } catch (renewErr) {
          const errMsg = renewErr instanceof Error ? renewErr.message : "Renewal failed";
          await logRenewalAction(supabaseAdmin, {
            subscription_id: sub.id,
            organization_id: sub.organization_id,
            client_id: sub.client_id,
            action: "renew",
            previous_expires_at: previousExpiry,
            new_expires_at: null,
            success: false,
            error_message: errMsg,
          });
          throw renewErr;
        }
        break;
      }

      case "recreateWebhook": {
        const { data: sub, error: subErr } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("id", payload.subscription_id)
          .eq("organization_id", payload.organization_id)
          .single();
        if (subErr) throw subErr;

        // Verify connection is still valid
        const { data: conn } = await supabaseAdmin
          .from("legal_connect_connections")
          .select("id, status")
          .eq("id", sub.connection_id)
          .eq("organization_id", payload.organization_id)
          .maybeSingle();

        if (!conn || conn.status !== "connected") {
          await logRenewalAction(supabaseAdmin, {
            subscription_id: sub.id,
            organization_id: sub.organization_id,
            client_id: sub.client_id,
            action: "recreate",
            previous_expires_at: sub.expires_at,
            new_expires_at: null,
            success: false,
            error_message: "Connection is not active — cannot recreate webhook",
          });
          return new Response(JSON.stringify({ error: "Connection is not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // In production: POST to Clio to create new webhook, get new remote_webhook_id
        const newExpiry = new Date(Date.now() + CLIO_MAX_WEBHOOK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const newRenewAfter = new Date(Date.now() + CLIO_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const newRemoteId = `recreated_${crypto.randomUUID().slice(0, 8)}`;

        const { data, error } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .update({
            remote_webhook_id: newRemoteId,
            expires_at: newExpiry,
            renew_after: newRenewAfter,
            status: "active",
            health_status: "healthy",
            failure_count: 0,
            disabled_reason: null,
          })
          .eq("id", payload.subscription_id)
          .select()
          .single();
        if (error) throw error;

        await logRenewalAction(supabaseAdmin, {
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          client_id: sub.client_id,
          action: "recreate",
          previous_expires_at: sub.expires_at,
          new_expires_at: newExpiry,
          success: true,
        });

        result = data;
        break;
      }

      case "disableWebhook": {
        const { data: sub, error: subErr } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("id", payload.subscription_id)
          .eq("organization_id", payload.organization_id)
          .single();
        if (subErr) throw subErr;

        const { data, error } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .update({
            status: "disabled",
            health_status: "disabled",
            disabled_reason: payload.reason ?? "Manually disabled by admin",
          })
          .eq("id", payload.subscription_id)
          .select()
          .single();
        if (error) throw error;

        await logRenewalAction(supabaseAdmin, {
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          client_id: sub.client_id,
          action: "disable",
          previous_expires_at: sub.expires_at,
          new_expires_at: null,
          success: true,
        });

        result = data;
        break;
      }

      case "enableWebhook": {
        const { data: sub, error: subErr } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("id", payload.subscription_id)
          .eq("organization_id", payload.organization_id)
          .single();
        if (subErr) throw subErr;

        const newExpiry = new Date(Date.now() + CLIO_MAX_WEBHOOK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const newRenewAfter = new Date(Date.now() + CLIO_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .update({
            status: "active",
            health_status: "healthy",
            disabled_reason: null,
            expires_at: newExpiry,
            renew_after: newRenewAfter,
            failure_count: 0,
          })
          .eq("id", payload.subscription_id)
          .select()
          .single();
        if (error) throw error;

        await logRenewalAction(supabaseAdmin, {
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          client_id: sub.client_id,
          action: "enable",
          previous_expires_at: sub.expires_at,
          new_expires_at: newExpiry,
          success: true,
        });

        result = data;
        break;
      }

      case "getWebhookRenewalLog": {
        let q = supabaseAdmin
          .from("legal_connect_webhook_renewal_log")
          .select("*")
          .eq("organization_id", payload.organization_id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (payload.subscription_id) q = q.eq("subscription_id", payload.subscription_id);
        if (payload.client_id) q = q.eq("client_id", payload.client_id);
        const { data, error } = await q;
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
