import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-five9-domain',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const webhookSecret = req.headers.get('x-webhook-secret');
    const domainHeader = req.headers.get('x-five9-domain');

    if (!webhookSecret || !domainHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing x-webhook-secret or x-five9-domain header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate webhook secret against domain
    const { data: domain, error: dErr } = await supabase
      .from('five9_domains')
      .select('id, organization_id, webhook_secret')
      .eq('domain', domainHeader)
      .single();

    if (dErr || !domain || domain.webhook_secret !== webhookSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid webhook secret' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { event_type, data } = payload;

    // Log the webhook event
    await supabase.from('api_logs').insert({
      endpoint: `five9-webhook/${event_type || 'unknown'}`,
      method: 'POST',
      status: 'success',
      request_payload: payload,
      response: { received: true },
      response_time_ms: 0,
    });

    // --- Web callback outcome writeback ---
    if (event_type === 'call_ended' || event_type === 'disposition_set' || event_type === 'web_callback_result') {
      const callbackId = data?.callback_id;
      const five9CallId = data?.call_id || data?.five9_call_id;
      const phone = data?.phone || data?.ani;

      if (callbackId || five9CallId || phone) {
        // Try to match a web_callbacks row
        let query = supabase.from('web_callbacks').select('id').eq('organization_id', domain.organization_id);
        if (callbackId) {
          query = query.eq('id', callbackId);
        } else if (five9CallId) {
          query = query.eq('five9_call_id', five9CallId);
        } else if (phone) {
          query = query.eq('contact_phone', phone).in('status', ['pending', 'dialing']);
        }

        const { data: callbacks } = await query.limit(1);
        if (callbacks && callbacks.length > 0) {
          const updateData: Record<string, unknown> = {};
          if (data?.disposition) updateData.call_disposition = data.disposition;
          if (data?.duration || data?.call_duration_seconds) updateData.call_duration_seconds = data.duration || data.call_duration_seconds;
          if (data?.recording_url) updateData.recording_url = data.recording_url;
          if (five9CallId) updateData.five9_call_id = five9CallId;

          // Map status
          const callStatus = data?.call_status || data?.status;
          if (callStatus === 'completed' || data?.disposition) {
            updateData.status = 'completed';
          } else if (callStatus === 'no_answer') {
            updateData.status = 'no_answer';
          } else if (callStatus === 'failed' || callStatus === 'error') {
            updateData.status = 'failed';
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from('web_callbacks').update(updateData).eq('id', callbacks[0].id);
          }
        }
      }
    }

    // Trigger downstream actions based on event type
    if (event_type === 'call_ended' || event_type === 'disposition_set') {
      // Find tenant for this domain and trigger CRM push if configured
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, notification_triggers')
        .eq('five9_domain_id', domain.id);

      for (const tenant of (tenants || [])) {
        const triggers = tenant.notification_triggers as Record<string, boolean> | null;
        if (triggers?.[event_type]) {
          // Fire-and-forget notification
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({ tenant_id: tenant.id, event_type, data }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Five9 webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
