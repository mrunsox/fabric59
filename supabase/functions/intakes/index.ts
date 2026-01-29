import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing X-Tenant-Id header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.contact || !body.contact.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: contact.name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For now, return a placeholder response
    // In production, this would:
    // 1. Look up tenant CRM type and credentials
    // 2. Call appropriate CRM adapter (Clio, Workiz, etc.)
    // 3. Map unified payload to CRM-specific format
    // 4. Create contact + matter/job in CRM
    // 5. Return unified response
    
    const response = {
      success: true,
      tenant_id: tenantId,
      message: "Intake created successfully (simulation)",
      data: {
        contact_id: crypto.randomUUID(),
        intake_id: crypto.randomUUID(),
        ...body
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
