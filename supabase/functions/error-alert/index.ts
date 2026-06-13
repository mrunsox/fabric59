import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, isOpsUser } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await isOpsUser(auth.user.id);
  if (!allowed) {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { error_type, message, details, tenant_id } = await req.json();
    if (!error_type || !message) {
      return new Response(JSON.stringify({ success: false, error: 'error_type and message required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alertedVia: string[] = [];

    // Look up alerting config
    const { data: configs } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['alert_email', 'alert_slack_enabled', 'resend_api_key', 'resend_from_email']);

    const configMap: Record<string, string> = {};
    for (const c of (configs || [])) configMap[c.key] = c.value;

    // Send email alert via Resend
    if (configMap.alert_email && configMap.resend_api_key) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${configMap.resend_api_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: configMap.resend_from_email || 'alerts@fabric59.com',
            to: [configMap.alert_email],
            subject: `[ALERT] ${error_type}: ${message}`,
            html: `
              <h2 style="color:#ef4444">⚠️ Error Alert</h2>
              <p><strong>Type:</strong> ${error_type}</p>
              <p><strong>Message:</strong> ${message}</p>
              ${tenant_id ? `<p><strong>Tenant:</strong> ${tenant_id}</p>` : ''}
              ${details ? `<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px">${JSON.stringify(details, null, 2)}</pre>` : ''}
              <p style="color:#6b7280;font-size:12px">Sent by Fabric59 Error Alerting at ${new Date().toISOString()}</p>
            `,
          }),
        });
        if (emailRes.ok) alertedVia.push('email');
      } catch (e) {
        console.error('Email alert failed:', e);
      }
    }

    // Send Slack alert
    if (configMap.alert_slack_enabled === 'true') {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            action: 'sendMessage',
            channel: '#alerts',
            text: `🚨 *${error_type}*: ${message}${tenant_id ? ` (tenant: ${tenant_id})` : ''}`,
          }),
        });
        alertedVia.push('slack');
      } catch (e) {
        console.error('Slack alert failed:', e);
      }
    }

    // Log alert
    await supabase.from('error_alerts').insert({
      error_type,
      message,
      details,
      tenant_id: tenant_id || null,
      alerted_via: alertedVia,
    });

    return new Response(JSON.stringify({ success: true, alerted_via: alertedVia }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error alert error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
