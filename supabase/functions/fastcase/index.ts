import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id' };
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return new Response(JSON.stringify({ error: 'Missing X-Tenant-Id header' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { action, payload } = await req.json();
    return new Response(JSON.stringify({ success: true, tenant_id: tenantId, action, message: `Fastcase ${action} endpoint — API integration pending`, payload }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
