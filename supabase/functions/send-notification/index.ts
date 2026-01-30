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

    // Look up tenant's Slack webhook URL
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("slack_webhook_url, notification_triggers, name")
      .eq("id", body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if Slack is configured
    if (!tenant.slack_webhook_url) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "No Slack webhook configured for this tenant",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if this trigger is enabled
    const triggers = tenant.notification_triggers as Record<string, boolean>;
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

    // Build Slack message
    const slackMessage = buildSlackMessage(body, tenant.name);

    // Send to Slack
    let slackResponse: Response;
    let responseBody: unknown;
    let status: "sent" | "failed" = "sent";

    try {
      slackResponse = await fetch(tenant.slack_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage),
      });

      responseBody = await slackResponse.text();

      if (!slackResponse.ok) {
        status = "failed";
      }
    } catch (slackError) {
      status = "failed";
      responseBody = { error: slackError instanceof Error ? slackError.message : "Unknown error" };
    }

    // Log notification to database
    const { error: logError } = await supabase.from("notifications").insert({
      tenant_id: body.tenant_id,
      channel: "slack",
      recipient: tenant.slack_webhook_url,
      payload: body.payload,
      status,
      response: typeof responseBody === "string" ? { text: responseBody } : responseBody,
      trigger_event: body.trigger_event,
    });

    if (logError) {
      console.error("Failed to log notification:", logError);
    }

    return new Response(
      JSON.stringify({
        success: status === "sent",
        status,
        message:
          status === "sent"
            ? "Notification sent successfully"
            : "Failed to send notification",
      }),
      {
        status: status === "sent" ? 200 : 500,
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

function buildSlackMessage(
  request: NotificationRequest,
  tenantName: string
): Record<string, unknown> {
  const { trigger_event, payload } = request;

  let title = "📞 Notification";
  let fields: Array<{ title: string; value: string; short: boolean }> = [];

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
