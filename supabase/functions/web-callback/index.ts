import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-five9-domain',
};

const VALID_REASONS = ['sales', 'support', 'partner'];
const VALID_MODES = ['human', 'ai'];
const VALID_CALLBACK_TYPES = ['instant', 'scheduled'];
const VALID_PRIORITIES = ['high', 'normal', 'low'];

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 10) return null;
  // If 10 digits, assume US and prepend +1
  if (digits.length === 10) return `+1${digits}`;
  // If starts with 1 and 11 digits, prepend +
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // If already has +, keep it
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();

  try {
    // --- Authentication: webhook secret + domain header, OR JWT ---
    let organizationId: string | null = null;
    let tenantId: string | null = null;
    let five9DomainId: string | null = null;

    const webhookSecret = req.headers.get('x-webhook-secret');
    const domainHeader = req.headers.get('x-five9-domain');

    if (webhookSecret && domainHeader) {
      // Webhook-style auth
      const { data: domain, error: dErr } = await supabase
        .from('five9_domains')
        .select('id, organization_id, webhook_secret')
        .eq('domain', domainHeader)
        .single();

      if (dErr || !domain || domain.webhook_secret !== webhookSecret) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid webhook credentials' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      organizationId = domain.organization_id;
      five9DomainId = domain.id;
    } else {
      // JWT auth fallback
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub as string;
      // Get first org for the user
      const { data: orgIds } = await supabase.rpc('get_user_org_ids', { _user_id: userId });
      if (!orgIds || orgIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No organization found for user' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      organizationId = orgIds[0];
    }

    // --- Parse and validate payload ---
    const payload = await req.json();
    const {
      contact_name,
      contact_phone,
      contact_email,
      source_channel,
      source_url,
      utm_source,
      utm_medium,
      utm_campaign,
      reason,
      mode,
      queue,
      callback_type,
      callback_time,
      priority,
      tenant_id: payloadTenantId,
      five9_domain_id: payloadDomainId,
    } = payload;

    // Use payload overrides if webhook didn't set them
    tenantId = tenantId || payloadTenantId || null;
    five9DomainId = five9DomainId || payloadDomainId || null;

    // Phone validation
    if (!contact_phone) {
      const errorRecord = {
        organization_id: organizationId,
        tenant_id: tenantId,
        five9_domain_id: five9DomainId,
        contact_name: contact_name || null,
        contact_phone: '',
        contact_email: contact_email || null,
        source_channel: source_channel || 'web_widget',
        status: 'error_missing_phone',
        error_message: 'Phone number is required',
        reason: 'sales',
        mode: 'human',
        queue: '24H-WEB-SALES',
        callback_type: 'instant',
        priority: 'normal',
      };
      await supabase.from('web_callbacks').insert(errorRecord);

      return new Response(JSON.stringify({ success: false, error: 'contact_phone is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = normalizePhone(contact_phone);
    if (!normalizedPhone) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid phone number format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize fields with defaults
    const safeReason = VALID_REASONS.includes(reason) ? reason : 'sales';
    const safeMode = VALID_MODES.includes(mode) ? mode : 'human';
    const safeQueue = queue || '24H-WEB-SALES';
    const safeCallbackType = VALID_CALLBACK_TYPES.includes(callback_type) ? callback_type : 'instant';
    const safePriority = VALID_PRIORITIES.includes(priority) ? priority : 'normal';

    // --- Insert web_callback record ---
    const callbackRecord = {
      organization_id: organizationId,
      tenant_id: tenantId,
      five9_domain_id: five9DomainId,
      contact_name: contact_name || null,
      contact_phone: normalizedPhone,
      contact_email: contact_email || null,
      source_channel: source_channel || 'web_widget',
      source_url: source_url || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      reason: safeReason,
      mode: safeMode,
      queue: safeQueue,
      callback_type: safeCallbackType,
      callback_time: safeCallbackType === 'scheduled' ? callback_time : null,
      priority: safePriority,
      status: 'pending',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('web_callbacks')
      .insert(callbackRecord)
      .select('id')
      .single();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return new Response(JSON.stringify({ success: false, error: 'Failed to create callback record' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callbackId = inserted.id;

    // --- Look up routing config ---
    let routingConfig = null;
    if (organizationId) {
      const { data: config } = await supabase
        .from('callback_routing_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('queue_name', safeQueue)
        .eq('is_active', true)
        .maybeSingle();
      routingConfig = config;
    }

    // --- Trigger Five9 dial ---
    let dialResult: { success: boolean; error?: string; five9CallId?: string } = { success: false };

    if (routingConfig && routingConfig.five9_list_name) {
      try {
        // Call five9-provisioning with addRecordToList action
        const provisioningUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/five9-provisioning`;
        const provResponse = await fetch(provisioningUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            action: 'addRecordToList',
            listName: routingConfig.five9_list_name,
            record: {
              number1: normalizedPhone,
              first_name: contact_name || '',
              email: contact_email || '',
              source_channel: source_channel || 'web_widget',
              reason: safeReason,
              priority: safePriority,
              callback_id: callbackId,
            },
          }),
        });

        const provData = await provResponse.json();
        dialResult = provData;

        if (provData.success) {
          // Update callback status to dialing
          await supabase
            .from('web_callbacks')
            .update({
              status: 'dialing',
              five9_call_id: provData.five9CallId || null,
            })
            .eq('id', callbackId);
        } else {
          await supabase
            .from('web_callbacks')
            .update({
              status: 'failed',
              error_message: provData.error || 'Five9 dial failed',
            })
            .eq('id', callbackId);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown dial error';
        await supabase
          .from('web_callbacks')
          .update({ status: 'failed', error_message: errMsg })
          .eq('id', callbackId);
        dialResult = { success: false, error: errMsg };
      }
    }
    // If no routing config, leave as pending for manual processing

    // --- Log to api_logs ---
    await supabase.from('api_logs').insert({
      tenant_id: tenantId,
      endpoint: 'web-callback',
      method: 'POST',
      status: dialResult.success ? 'success' : (routingConfig ? 'error' : 'success'),
      request_payload: { ...callbackRecord, callback_id: callbackId },
      response: dialResult,
      response_time_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify({
      success: true,
      callback_id: callbackId,
      status: routingConfig ? (dialResult.success ? 'dialing' : 'failed') : 'pending',
      routing_matched: !!routingConfig,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Web callback error:', error);

    // Log error
    await supabase.from('api_logs').insert({
      endpoint: 'web-callback',
      method: 'POST',
      status: 'error',
      response: { error: error instanceof Error ? error.message : 'Unknown error' },
      response_time_ms: Date.now() - startTime,
    }).catch(() => {});

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
