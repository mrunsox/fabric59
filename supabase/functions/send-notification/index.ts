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
    contact?: {
      name: string;
      phone?: string;
      email?: string;
    };
    intake?: {
      type?: string;
      service?: string;
      urgency?: string;
    };
    message?: string;
    [key: string]: unknown;
  };
}

interface TenantWebhooks {
  slack_webhook_url: string | null;
  zapier_webhook_url: string | null;
  make_webhook_url: string | null;
  pabbly_webhook_url: string | null;
  n8n_webhook_url: string | null;
  notification_triggers: Record<string, boolean>;
  name: string;
}

interface WebhookResult {
  platform: string;
  success: boolean;
  response?: unknown;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up tenant's webhook URLs
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("slack_webhook_url, zapier_webhook_url, make_webhook_url, pabbly_webhook_url, n8n_webhook_url, notification_triggers, name")
      .eq("id", body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantData = tenant as TenantWebhooks;

    // Check if this trigger is enabled
    const triggers = tenantData.notification_triggers as Record<string, boolean>;
    if (!triggers?.[body.trigger_event]) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: `Trigger '${body.trigger_event}' is not enabled for this tenant`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Collect all configured webhooks
    const webhooks: Array<{ platform: string; url: string; isSlack: boolean }> = [];
    
    if (tenantData.slack_webhook_url) {
      webhooks.push({ platform: "slack", url: tenantData.slack_webhook_url, isSlack: true });
    }
    if (tenantData.zapier_webhook_url) {
      webhooks.push({ platform: "zapier", url: tenantData.zapier_webhook_url, isSlack: false });
    }
    if (tenantData.make_webhook_url) {
      webhooks.push({ platform: "make", url: tenantData.make_webhook_url, isSlack: false });
    }
    if (tenantData.pabbly_webhook_url) {
      webhooks.push({ platform: "pabbly", url: tenantData.pabbly_webhook_url, isSlack: false });
    }
    if (tenantData.n8n_webhook_url) {
      webhooks.push({ platform: "n8n", url: tenantData.n8n_webhook_url, isSlack: false });
    }

    // If no webhooks configured, return early
    if (webhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "No webhook URLs configured for this tenant",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build payloads
    const slackMessage = buildSlackMessage(body, tenantData.name);
    const genericPayload = buildGenericPayload(body, tenantData.name);

    // Send to all configured webhooks in parallel
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

          // Log to database
          await supabase.from("notifications").insert({
            tenant_id: body.tenant_id,
            channel: webhook.platform as "slack" | "email" | "sms",
            recipient: webhook.url,
            payload: body.payload,
            status: success ? "sent" : "failed",
            response: { text: responseBody, status: response.status },
            trigger_event: body.trigger_event,
          });

          return {
            platform: webhook.platform,
            success,
            response: responseBody,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          // Log failure to database
          await supabase.from("notifications").insert({
            tenant_id: body.tenant_id,
            channel: webhook.platform as "slack" | "email" | "sms",
            recipient: webhook.url,
            payload: body.payload,
            status: "failed",
            response: { error: errorMessage },
            trigger_event: body.trigger_event,
          });

          return {
            platform: webhook.platform,
            success: false,
            error: errorMessage,
          };
        }
      })
    );

    // Summarize results
    const summaryResults = results.map((r) => {
      if (r.status === "fulfilled") {
        return r.value;
      }
      return { platform: "unknown", success: false, error: "Promise rejected" };
    });

    const allSuccessful = summaryResults.every((r) => r.success);
    const someSuccessful = summaryResults.some((r) => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        partial: someSuccessful && !allSuccessful,
        results: summaryResults,
        message: allSuccessful
          ? "All notifications sent successfully"
          : someSuccessful
          ? "Some notifications failed"
          : "All notifications failed",
      }),
      {
        status: allSuccessful ? 200 : someSuccessful ? 207 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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

/**
 * Build a standardized payload for generic webhook platforms (Zapier, Make, Pabbly, n8n)
 */
function buildGenericPayload(
  request: NotificationRequest,
  tenantName: string
): Record<string, unknown> {
  return {
    event: request.trigger_event,
    tenant_id: request.tenant_id,
    tenant_name: tenantName,
    timestamp: new Date().toISOString(),
    data: request.payload,
  };
}

/**
 * Build a Slack-formatted message with attachments
 */
function buildSlackMessage(
  request: NotificationRequest,
  tenantName: string
): Record<string, unknown> {
  const { trigger_event, payload } = request;

  let title = "📞 Notification";
  const fields: Array<{ title: string; value: string; short: boolean }> = [];

  switch (trigger_event) {
    case "intake_created":
      title = "📞 New Intake Received";
      if (payload.contact) {
        fields.push({
          title: "Contact",
          value: payload.contact.name,
          short: true,
        });
        if (payload.contact.phone) {
          fields.push({
            title: "Phone",
            value: payload.contact.phone,
            short: true,
          });
        }
        if (payload.contact.email) {
          fields.push({
            title: "Email",
            value: payload.contact.email,
            short: true,
          });
        }
      }
      if (payload.intake) {
        if (payload.intake.type) {
          fields.push({ title: "Type", value: payload.intake.type, short: true });
        }
        if (payload.intake.service) {
          fields.push({
            title: "Service",
            value: payload.intake.service,
            short: true,
          });
        }
        if (payload.intake.urgency) {
          const urgencyEmoji =
            payload.intake.urgency === "high"
              ? "🔴"
              : payload.intake.urgency === "medium"
              ? "🟡"
              : "🟢";
          fields.push({
            title: "Urgency",
            value: `${urgencyEmoji} ${payload.intake.urgency.charAt(0).toUpperCase() + payload.intake.urgency.slice(1)}`,
            short: true,
          });
        }
      }
      break;

    case "call_ended":
      title = "📱 Call Completed";
      break;

    case "contact_updated":
      title = "👤 Contact Updated";
      if (payload.contact) {
        fields.push({
          title: "Contact",
          value: payload.contact.name,
          short: true,
        });
      }
      break;

    default:
      if (payload.message) {
        fields.push({
          title: "Message",
          value: payload.message,
          short: false,
        });
      }
  }

  return {
    attachments: [
      {
        color: "#6366f1",
        pretext: title,
        fields,
        footer: `Five9 Integration Fabric • ${tenantName}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}
