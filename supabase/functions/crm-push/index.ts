import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrmAdapter {
  pushData(action: string, data: Record<string, unknown>, apiUrl: string, apiKey: string): Promise<{ success: boolean; response?: unknown; error?: string }>;
}

const clioAdapter: CrmAdapter = {
  async pushData(action, data, apiUrl, apiKey) {
    const endpoint = action === 'create_contact' ? '/contacts' : action === 'update_contact' ? `/contacts/${data.id}` : '/activities';
    const method = action === 'update_contact' ? 'PATCH' : 'POST';
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const body = await res.json();
      return { success: res.ok, response: body };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Clio API error' };
    }
  }
};

const genericRestAdapter: CrmAdapter = {
  async pushData(action, data, apiUrl, apiKey) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const body = await res.json();
      return { success: res.ok, response: body };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'API error' };
    }
  }
};

const adapters: Record<string, CrmAdapter> = {
  clio: clioAdapter,
  workiz: genericRestAdapter,
  salesforce: genericRestAdapter,
  hubspot: genericRestAdapter,
  zendesk: genericRestAdapter,
  generic_rest: genericRestAdapter,
  other: genericRestAdapter,
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
    const { tenant_id, crm_action, data } = await req.json();
    if (!tenant_id || !crm_action) {
      return new Response(JSON.stringify({ success: false, error: 'tenant_id and crm_action required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tenant, error: tErr } = await supabase.from('tenants').select('crm_type, crm_api_url, crm_api_key').eq('id', tenant_id).single();
    if (tErr || !tenant) {
      return new Response(JSON.stringify({ success: false, error: 'Tenant not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adapter = adapters[tenant.crm_type] || adapters.other;
    const startTime = Date.now();
    const result = await adapter.pushData(crm_action, data || {}, tenant.crm_api_url || '', tenant.crm_api_key || '');
    const elapsed = Date.now() - startTime;

    // Log to api_logs
    await supabase.from('api_logs').insert({
      tenant_id,
      endpoint: `crm-push/${crm_action}`,
      method: 'POST',
      status: result.success ? 'success' : 'error',
      request_payload: { crm_action, data },
      response: result.response || { error: result.error },
      response_time_ms: elapsed,
    });

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CRM push error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
