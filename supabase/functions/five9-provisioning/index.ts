import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIVE9_SOAP_URL = 'https://api.five9.com/wsadmin/v13/AdminWebService';

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function soapCall(username: string, password: string, action: string, body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  // Normalize: non-email Five9 usernames (e.g. "24H-Virtual") may have hyphens
  // instead of spaces. Replace hyphens with spaces for non-email usernames only.
  const normalizedUsername = username.includes("@")
    ? username
    : username.replace(/-/g, " ");
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
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
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

  try {
    const FIVE9_USERNAME = await getConfig('five9_username', Deno.env.get('FIVE9_USERNAME'));
    const FIVE9_PASSWORD = await getConfig('five9_password', Deno.env.get('FIVE9_PASSWORD'));

    if (!FIVE9_USERNAME || !FIVE9_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: 'Five9 credentials not configured. Please add them in Settings → Integration Credentials.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { action } = payload;

    let responseData: Record<string, unknown> = { success: false };

    if (action === 'create') {
      const { firstName, lastName, email, username, extension, role, password } = payload;
      const soapBody = `<ser:createUser>
  <userInfo>
    <generalInfo>
      <firstName>${escapeXml(firstName)}</firstName>
      <lastName>${escapeXml(lastName)}</lastName>
      <EMail>${escapeXml(email)}</EMail>
      <userName>${escapeXml(username)}</userName>
      <extension>${escapeXml(extension)}</extension>
      <userProfileName>Agent</userProfileName>
      <active>true</active>
      <mustChangePassword>true</mustChangePassword>
    </generalInfo>
    <roles>
      <role>${escapeXml(role || 'Agent')}</role>
    </roles>
    <password>${escapeXml(password)}</password>
  </userInfo>
</ser:createUser>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'createUser', soapBody);
      const userId = extractFirst(xml, 'userId') || extractFirst(xml, 'id');
      responseData = { success: true, five9UserId: userId };

    } else if (action === 'deactivate') {
      const { username } = payload;
      const soapBody = `<ser:setUserState>
  <username>${escapeXml(username)}</username>
  <active>false</active>
</ser:setUserState>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'setUserState', soapBody);
      responseData = { success: true };

    } else if (action === 'getExtensions') {
      const soapBody = `<ser:getUsersGeneralInfo/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getUsersGeneralInfo', soapBody);
      const extensions = [...new Set(extractValues(xml, 'extension').filter(e => e && e !== '0'))];
      responseData = { success: true, extensions };

    } else if (action === 'getAllUsers') {
      const soapBody = `<ser:getUsersGeneralInfo/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getUsersGeneralInfo', soapBody);

      // Parse user blocks
      const userBlocks = xml.match(/<generalInfo>(.*?)<\/generalInfo>/gs) || [];
      const users = userBlocks.map(block => ({
        firstName: extractFirst(block, 'firstName'),
        lastName: extractFirst(block, 'lastName'),
        email: extractFirst(block, 'EMail') || extractFirst(block, 'email'),
        userName: extractFirst(block, 'userName'),
        extension: extractFirst(block, 'extension'),
        active: extractFirst(block, 'active') === 'true',
      }));

      responseData = { success: true, users };

    } else if (action === 'getSkills') {
      const soapBody = `<ser:getSkills/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getSkills', soapBody);
      const skills = [...new Set(extractValues(xml, 'name').filter(Boolean))];
      responseData = { success: true, skills };

    } else if (action === 'addSkillsToUser') {
      const { username, skills } = payload;
      const skillsXml = (skills as string[])
        .map(skill => `<skillName>${escapeXml(skill)}</skillName><level>1</level>`)
        .join('\n');
      const soapBody = `<ser:addSkillsToUser>
  <username>${escapeXml(username)}</username>
  <skills>
    ${skillsXml}
  </skills>
</ser:addSkillsToUser>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'addSkillsToUser', soapBody);
      responseData = { success: true };

    } else if (action === 'getUserInfo') {
      const { username } = payload;
      const soapBody = `<ser:getUserInfo>
  <username>${escapeXml(username)}</username>
</ser:getUserInfo>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getUserInfo', soapBody);
      const info = {
        firstName: extractFirst(xml, 'firstName'),
        lastName: extractFirst(xml, 'lastName'),
        email: extractFirst(xml, 'EMail') || extractFirst(xml, 'email'),
        extension: extractFirst(xml, 'extension'),
        active: extractFirst(xml, 'active') === 'true',
        userProfileName: extractFirst(xml, 'userProfileName'),
        skills: extractValues(xml, 'skillName'),
      };
      responseData = { success: true, info };
    } else {
      responseData = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Five9 provisioning error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
