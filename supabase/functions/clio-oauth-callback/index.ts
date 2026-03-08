import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // JSON: { tenantId, organizationId, redirectUrl }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: 'Missing code or state parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let stateData: { tenantId: string; organizationId: string; redirectUrl?: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clioClientId = Deno.env.get('CLIO_CLIENT_ID');
    const clioClientSecret = Deno.env.get('CLIO_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!clioClientId || !clioClientSecret) {
      return new Response(JSON.stringify({ error: 'Clio OAuth credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/clio-oauth-callback`;
    const tokenRes = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clioClientId,
        client_secret: clioClientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Clio token exchange failed:', errBody);
      return new Response(JSON.stringify({ error: 'Token exchange failed', details: errBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenRes.json();

    // Store tokens in oauth_tokens
    const { data: oauthRow, error: insertErr } = await supabase
      .from('oauth_tokens')
      .insert({
        tenant_id: stateData.tenantId,
        organization_id: stateData.organizationId,
        provider: 'clio',
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token,
        expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
        scopes: tokenData.scope || '',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Failed to store OAuth tokens:', insertErr);
      return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update tenant's integration_configs with the new oauthTokenId
    const { data: tenant } = await supabase
      .from('tenants')
      .select('integration_configs')
      .eq('id', stateData.tenantId)
      .single();

    const currentConfigs = (tenant?.integration_configs as Record<string, any>) || {};
    const updatedConfigs = {
      ...currentConfigs,
      clio: {
        ...(currentConfigs.clio || {}),
        enabled: true,
        oauthTokenId: oauthRow.id,
      },
    };

    await supabase
      .from('tenants')
      .update({ integration_configs: updatedConfigs })
      .eq('id', stateData.tenantId);

    // Log the OAuth completion
    await supabase.from('api_logs').insert({
      tenant_id: stateData.tenantId,
      endpoint: 'clio-oauth-callback',
      method: 'GET',
      status: 'success',
      request_payload: { provider: 'clio' },
      response: { oauthTokenId: oauthRow.id },
      response_time_ms: 0,
    });

    // Redirect back to admin UI
    const redirectUrl = stateData.redirectUrl || `${Deno.env.get('SITE_URL') || 'https://fabric59.lovable.app'}/admin/tenants?clio_connected=true`;
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': redirectUrl },
    });
  } catch (error) {
    console.error('Clio OAuth callback error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
