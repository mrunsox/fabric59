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
    // Read credentials ONLY from env secrets — bypass DB config to avoid stale/wrong values
    const FIVE9_USERNAME = Deno.env.get('FIVE9_USERNAME');
    const FIVE9_PASSWORD = Deno.env.get('FIVE9_PASSWORD');

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
      const userBlocks = xml.match(/<return>(.*?)<\/return>/gs) || [];
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
    } else if (action === 'syncFromFive9') {
      const { organizationId } = payload;

      // Fetch both users and skills in parallel for sync
      const usersBody = `<ser:getUsersGeneralInfo/>`;
      const skillsBody = `<ser:getSkills/>`;
      const [usersXml, skillsXml] = await Promise.all([
        soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getUsersGeneralInfo', usersBody),
        soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getSkills', skillsBody),
      ]);

      const userBlocks = usersXml.match(/<return>(.*?)<\/return>/gs) || [];
      const users = userBlocks.map(block => ({
        firstName: extractFirst(block, 'firstName'),
        lastName: extractFirst(block, 'lastName'),
        email: extractFirst(block, 'EMail') || extractFirst(block, 'email'),
        userName: extractFirst(block, 'userName'),
        extension: extractFirst(block, 'extension'),
        active: extractFirst(block, 'active') === 'true',
      }));

      const skills = [...new Set(extractValues(skillsXml, 'name').filter(Boolean))];

      // --- Server-side DB upserts using service role key ---
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Role inference based on extension ranges
      function inferRole(extension: string): string {
        const ext = parseInt(extension, 10);
        if (isNaN(ext)) return 'Unknown';
        if (ext >= 0 && ext <= 99) return 'Manager';
        if (ext >= 1000 && ext <= 1100) return 'English Support';
        if (ext >= 2000 && ext <= 2100) return 'French Support';
        if (ext >= 3000 && ext <= 3100) return 'Spanish Support';
        if (ext >= 4000 && ext <= 4100) return 'Trilingual Support';
        if (ext >= 5000 && ext <= 5100) return 'Supervisor';
        if (ext >= 6000 && ext <= 6100) return 'QA Specialist';
        if (ext >= 7000 && ext <= 7100) return 'Tech Support';
        return 'Agent';
      }

      // Get existing agents to avoid duplicates
      const { data: existingAgents } = await adminClient
        .from('agents')
        .select('five9_username');
      const existingUsernames = new Set((existingAgents || []).map((a: { five9_username: string | null }) => a.five9_username));

      const newAgents = users
        .filter(u => u.userName && !existingUsernames.has(u.userName))
        .map(u => ({
          first_name: u.firstName,
          last_name: u.lastName,
          email: u.email || `${u.userName}@five9.local`,
          role: inferRole(u.extension),
          extension: u.extension || null,
          five9_username: u.userName,
          status: u.active ? 'active' : 'inactive',
        }));

      let agentsAdded = 0;
      if (newAgents.length > 0) {
        const { error: insertErr } = await adminClient.from('agents').insert(newAgents);
        if (insertErr) console.error('Agent insert error:', insertErr);
        else agentsAdded = newAgents.length;
      }

      // Get existing tenants to avoid duplicates
      const { data: existingTenants } = await adminClient
        .from('tenants')
        .select('name');
      const existingNames = new Set((existingTenants || []).map((t: { name: string }) => t.name));

      const newTenants = skills
        .filter(s => !existingNames.has(s))
        .map(s => ({
          name: s,
          crm_type: 'other',
          status: 'active',
          ...(organizationId ? { organization_id: organizationId } : {}),
        }));

      let tenantsAdded = 0;
      if (newTenants.length > 0) {
        const { error: insertErr } = await adminClient.from('tenants').insert(newTenants);
        if (insertErr) console.error('Tenant insert error:', insertErr);
        else tenantsAdded = newTenants.length;
      }

      responseData = { success: true, agentsAdded, tenantsAdded };

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
