import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function getConfig(key: string, envFallback: string | undefined): Promise<string | undefined> {
  if (envFallback) return envFallback;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
    return data?.value ?? undefined;
  } catch { return undefined; }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = await getConfig('resend_api_key', Deno.env.get('RESEND_API_KEY'));
    const RESEND_FROM_EMAIL = await getConfig('resend_from_email', Deno.env.get('RESEND_FROM_EMAIL'));

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return new Response(JSON.stringify({ success: false, error: 'Resend secrets not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { agentName, email, five9Username, extension, role, password, toEmail } = await req.json();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Agent Credentials</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e5e5e5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 8px;">Welcome to the Team</h1>
      <p style="color: #888; margin: 0;">Your agent account credentials</p>
    </div>

    <div style="background: #111; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #222;">
      <h2 style="font-size: 16px; font-weight: 600; color: #a78bfa; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.05em;">Account Details</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px; width: 140px;">Agent Name</td>
          <td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 500;">${agentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Work Email</td>
          <td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 500;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Five9 Username</td>
          <td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 500;">${five9Username}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Extension</td>
          <td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 500;">${extension}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Role</td>
          <td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 500;">${role}</td>
        </tr>
      </table>
    </div>

    <div style="background: #2a1f00; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #f59e0b40;">
      <h2 style="font-size: 16px; font-weight: 600; color: #f59e0b; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Password</h2>
      <p style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; color: #fbbf24; margin: 0; letter-spacing: 0.1em;">${password}</p>
    </div>

    <div style="background: #1a0f0f; border-radius: 8px; padding: 16px; border: 1px solid #ef444430;">
      <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
        ⚠️ <strong>Important:</strong> You will be required to change this password on your first login. Please do not share these credentials with anyone.
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [toEmail || email],
        subject: `Agent Credentials — ${agentName}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send credentials error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
