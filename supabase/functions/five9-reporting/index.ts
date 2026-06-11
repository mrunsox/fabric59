import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIVE9_SOAP_URL = 'https://api.five9.com/wsadmin/v13/AdminWebService';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function soapCall(username: string, password: string, action: string, body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const normalizedUsername = username.includes("@") ? username : username.replace(/-/g, " ");
  const credentials = btoa(`${normalizedUsername}:${password}`);
  const response = await fetch(FIVE9_SOAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': action,
      'Authorization': `Basic ${credentials}`,
    },
    body: envelope,
  });

  const text = await response.text();
  if (text.includes('<faultstring>') || text.includes(':Fault>')) {
    const faultMatch = text.match(/<faultstring>(.*?)<\/faultstring>/s);
    throw new Error(faultMatch ? faultMatch[1] : 'SOAP fault occurred');
  }
  return text;
}

function extractValues(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gs');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) results.push(match[1].trim());
  return results;
}

function extractFirst(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's'));
  return match ? match[1].trim() : '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;


  try {
    const FIVE9_USERNAME = Deno.env.get('FIVE9_USERNAME');
    const FIVE9_PASSWORD = Deno.env.get('FIVE9_PASSWORD');

    if (!FIVE9_USERNAME || !FIVE9_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: 'Five9 credentials not configured.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { action } = payload;
    let responseData: Record<string, unknown> = { success: false };

    if (action === 'getCallLogs') {
      const { startDate, endDate, organizationId } = payload;
      
      // Use Five9 Statistics API - getStatistics or run report
      // For now, we use the getCallLogRecords approach via SOAP
      const soapBody = `<ser:getCallLogRecords>
  <time>
    <start>${escapeXml(startDate)}</start>
    <end>${escapeXml(endDate)}</end>
  </time>
</ser:getCallLogRecords>`;

      try {
        const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getCallLogRecords', soapBody);
        
        // Parse call log records
        const recordBlocks = xml.match(/<return>(.*?)<\/return>/gs) || [];
        const records = recordBlocks.map(block => ({
          timestamp: extractFirst(block, 'timestamp') || extractFirst(block, 'date'),
          campaignName: extractFirst(block, 'campaignName') || extractFirst(block, 'campaign'),
          agentName: extractFirst(block, 'agentName') || extractFirst(block, 'agent'),
          customerName: extractFirst(block, 'customerName') || extractFirst(block, 'callerName'),
          phoneNumber: extractFirst(block, 'ANI') || extractFirst(block, 'phoneNumber') || extractFirst(block, 'number'),
          duration: extractFirst(block, 'callTime') || extractFirst(block, 'talkTime') || extractFirst(block, 'duration'),
          disposition: extractFirst(block, 'disposition') || extractFirst(block, 'dispositionName'),
        }));

        // Filter by allowed dispositions if organizationId provided
        if (organizationId) {
          const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );
          const { data: accessRows } = await adminClient
            .from('disposition_access')
            .select('disposition_name')
            .eq('organization_id', organizationId);
          
          if (accessRows && accessRows.length > 0) {
            const allowed = new Set(accessRows.map((r: { disposition_name: string }) => r.disposition_name.toLowerCase()));
            const filtered = records.filter(r => r.disposition && allowed.has(r.disposition.toLowerCase()));
            responseData = { success: true, records: filtered, total: filtered.length };
          } else {
            responseData = { success: true, records: [], total: 0, note: 'No dispositions configured for this organization' };
          }
        } else {
          responseData = { success: true, records, total: records.length };
        }
      } catch (err) {
        responseData = { success: false, error: err instanceof Error ? err.message : 'Failed to fetch call logs' };
      }

    } else {
      responseData = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
