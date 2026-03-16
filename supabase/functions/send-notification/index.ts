import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  tenant_id: string;
  trigger_event: string;
  payload: {
    contact?: { name: string; phone?: string; email?: string };
    intake?: { type?: string; service?: string; urgency?: string };
    message?: string;
    [key: string]: unknown;
  };
}

interface WebhookResult {
  platform: string;
  success: boolean;
  response?: unknown;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotificationRequest = await req.json();

    if (!body.tenant_id || !body.trigger_event) {
      return new Response(
        JSON.stringify({ error: "Missing tenant_id or trigger_event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read from integration_configs JSONB (unified source) with flat column fallback
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("name, notification_triggers, integration_configs, slack_webhook_url, zapier_webhook_url, make_webhook_url, pabbly_webhook_url, n8n_webhook_url")
      .eq("id", body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggers = (tenant.notification_triggers as Record<string, boolean>) ?? {};
    if (!triggers?.[body.trigger_event]) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: `Trigger '${body.trigger_event}' is not enabled` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract webhooks from integration_configs (primary) with flat column fallback
    const ic = (tenant.integration_configs as Record<string, any>) ?? {};
    const wh = ic.webhooks ?? {};

    const webhooks: Array<{ platform: string; url: string; isSlack: boolean }> = [];
    const slackUrl = wh.slack || tenant.slack_webhook_url;
    const zapierUrl = wh.zapier || tenant.zapier_webhook_url;
    const makeUrl = wh.make || tenant.make_webhook_url;
    const pabblyUrl = wh.pabbly || tenant.pabbly_webhook_url;
    const n8nUrl = wh.n8n || tenant.n8n_webhook_url;

    if (slackUrl) webhooks.push({ platform: "slack", url: slackUrl, isSlack: true });
    if (zapierUrl) webhooks.push({ platform: "zapier", url: zapierUrl, isSlack: false });
    if (makeUrl) webhooks.push({ platform: "make", url: makeUrl, isSlack: false });
    if (pabblyUrl) webhooks.push({ platform: "pabbly", url: pabblyUrl, isSlack: false });
    if (n8nUrl) webhooks.push({ platform: "n8n", url: n8nUrl, isSlack: false });

    if (webhooks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "No webhook URLs configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slackMessage = buildSlackMessage(body, tenant.name);
    const genericPayload = buildGenericPayload(body, tenant.name);

    const results = await Promise.allSettled(
      webhooks.map(async (webhook): Promise<WebhookResult> => {
        const payload = webhook.isSlack ? slackMessage : genericPayload;
        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const responseBody = await response.text();
          const success = response.ok;

          await supabase.from("notifications").insert({
            tenant_id: body.tenant_id,
            channel: webhook.platform as "slack" | "email" | "sms",
            recipient: webhook.url,
            payload: body.payload,
            status: success ? "sent" : "failed",
            response: { text: responseBody, status: response.status },
            trigger_event: body.trigger_event,
          });

          return { platform: webhook.platform, success, response: responseBody };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await supabase.from("notifications").insert({
            tenant_id: body.tenant_id,
            channel: webhook.platform as "slack" | "email" | "sms",
            recipient: webhook.url,
            payload: body.payload,
            status: "failed",
            response: { error: errorMessage },
            trigger_event: body.trigger_event,
          });
          return { platform: webhook.platform, success: false, error: errorMessage };
        }
      })
    );

    const summaryResults = results.map((r) =>
      r.status === "fulfilled" ? r.value : { platform: "unknown", success: false, error: "Promise rejected" }
    );
    const allSuccessful = summaryResults.every((r) => r.success);
    const someSuccessful = summaryResults.some((r) => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        partial: someSuccessful && !allSuccessful,
        results: summaryResults,
        message: allSuccessful ? "All notifications sent" : someSuccessful ? "Some notifications failed" : "All notifications failed",
      }),
      { status: allSuccessful ? 200 : someSuccessful ? 207 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildGenericPayload(request: NotificationRequest, tenantName: string) {
  return {
    event: request.trigger_event,
    tenant_id: request.tenant_id,
    tenant_name: tenantName,
    timestamp: new Date().toISOString(),
    data: request.payload,
  };
}

function buildSlackMessage(request: NotificationRequest, tenantName: string) {
  const { trigger_event, payload } = request;
  let title = "📞 Notification";
  const fields: Array<{ title: string; value: string; short: boolean }> = [];

  switch (trigger_event) {
    case "intake_created":
      title = "📞 New Intake Received";
      if (payload.contact) {
        fields.push({ title: "Contact", value: payload.contact.name, short: true });
        if (payload.contact.phone) fields.push({ title: "Phone", value: payload.contact.phone, short: true });
        if (payload.contact.email) fields.push({ title: "Email", value: payload.contact.email, short: true });
      }
      if (payload.intake) {
        if (payload.intake.type) fields.push({ title: "Type", value: payload.intake.type, short: true });
        if (payload.intake.service) fields.push({ title: "Service", value: payload.intake.service, short: true });
        if (payload.intake.urgency) {
          const emoji = payload.intake.urgency === "high" ? "🔴" : payload.intake.urgency === "medium" ? "🟡" : "🟢";
          fields.push({ title: "Urgency", value: `${emoji} ${payload.intake.urgency.charAt(0).toUpperCase() + payload.intake.urgency.slice(1)}`, short: true });
        }
      }
      break;
    case "call_ended":
      title = "📱 Call Completed";
      break;
    case "contact_updated":
      title = "👤 Contact Updated";
      if (payload.contact) fields.push({ title: "Contact", value: payload.contact.name, short: true });
      break;
    default:
      if (payload.message) fields.push({ title: "Message", value: payload.message, short: false });
  }

  return {
    attachments: [{
      color: "#6366f1",
      pretext: title,
      fields,
      footer: `Five9 Integration Fabric • ${tenantName}`,
      ts: Math.floor(Date.now() / 1000),
    }],
  };
}
