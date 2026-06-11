import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, requireOrgMember } from "../_shared/auth.ts";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    const { agentName, email, role, steps, dataTransfer, reason } = await req.json();

    // Look up HR email and Resend config
    const { data: configs } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['hr_notification_email', 'resend_api_key', 'resend_from_email']);

    const configMap: Record<string, string> = {};
    for (const c of (configs || [])) configMap[c.key] = c.value;

    if (!configMap.hr_notification_email || !configMap.resend_api_key) {
      return new Response(JSON.stringify({
        success: false,
        skipped: true,
        error: 'HR notification email or Resend API key not configured',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build step summary HTML
    const stepRows = (steps || []).map((s: { label: string; status: string }) =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${s.label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
          ${s.status === 'complete' ? '✅' : s.status === 'skipped' ? '⏭️' : s.status === 'error' ? '❌' : '⏳'}
          ${s.status}
        </td>
      </tr>`
    ).join('');

    const dataTransferSection = dataTransfer?.enabled
      ? `<h3 style="margin-top:20px">Data Transfer</h3>
         <p>Target: ${dataTransfer.targetEmail || 'N/A'}</p>
         <p>Drive: ${dataTransfer.transferDrive ? 'Yes' : 'No'} · Email: ${dataTransfer.transferEmail ? 'Yes' : 'No'}</p>`
      : '';

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a2e">Agent Offboarding Complete</h2>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Name:</strong> ${agentName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <h3>Offboarding Steps</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px 12px;text-align:left">Step</th>
              <th style="padding:8px 12px;text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>${stepRows}</tbody>
        </table>
        ${dataTransferSection}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          This is an automated notification from Fabric59.
        </p>
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${configMap.resend_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: configMap.resend_from_email || 'noreply@fabric59.com',
        to: [configMap.hr_notification_email],
        subject: `Offboarding Complete: ${agentName} (${email})`,
        html,
      }),
    });

    const emailData = await emailRes.json();

    return new Response(JSON.stringify({
      success: emailRes.ok,
      emailId: emailData.id,
      error: emailRes.ok ? undefined : JSON.stringify(emailData),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('HR notification error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
