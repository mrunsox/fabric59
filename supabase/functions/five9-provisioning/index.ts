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
      const soapBody = `<ser:modifyUser>
  <userGeneralInfo>
    <userName>${escapeXml(username)}</userName>
    <active>false</active>
  </userGeneralInfo>
</ser:modifyUser>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'modifyUser', soapBody);
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

    } else if (action === 'getCampaigns') {
      const soapBody = `<ser:getCampaigns/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getCampaigns', soapBody);
      const campaigns = [...new Set(extractValues(xml, 'name').filter(Boolean))];
      responseData = { success: true, campaigns };

    } else if (action === 'getCampaignProfiles') {
      const soapBody = `<ser:getCampaignProfiles/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getCampaignProfiles', soapBody);
      const profileBlocks = xml.match(/<return>(.*?)<\/return>/gs) || [];
      const profiles = profileBlocks.map(block => extractFirst(block, 'name')).filter(Boolean);
      responseData = { success: true, profiles };

    } else if (action === 'createDispositions') {
      const { dispositions } = payload as { dispositions: Array<{ name: string; type?: string; description?: string }> };
      const results: Array<{ name: string; success: boolean; error?: string }> = [];

      for (const dispo of dispositions) {
        try {
          const soapBody = `<ser:createDisposition>
  <disposition>
    <name>${escapeXml(dispo.name)}</name>
    <description>${escapeXml(dispo.description || '')}</description>
    <type>${escapeXml(dispo.type || 'FinalApplyToCampaigns')}</type>
    <agentMustConfirm>false</agentMustConfirm>
    <resetAttemptsCounter>false</resetAttemptsCounter>
  </disposition>
</ser:createDisposition>`;
          await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'createDisposition', soapBody);
          results.push({ name: dispo.name, success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          // If it already exists, treat as success
          if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
            results.push({ name: dispo.name, success: true, error: 'Already exists (skipped)' });
          } else {
            results.push({ name: dispo.name, success: false, error: msg });
          }
        }
      }
      responseData = { success: true, results };

    } else if (action === 'addDispositionsToCampaigns') {
      const { campaignDispositions, profileDispositions, dispositionGroups, campaigns, campaignProfiles } = payload as {
        campaignDispositions: string[];
        profileDispositions: Array<{ name: string; group?: string }>;
        dispositionGroups: string[];
        campaigns: string[];
        campaignProfiles: string[];
      };
      const results: Array<{ target: string; targetType: string; success: boolean; error?: string }> = [];

      // Add to campaigns
      for (const campaign of (campaigns || [])) {
        if (!campaignDispositions || campaignDispositions.length === 0) continue;
        try {
          const dispoXml = campaignDispositions.map(d => `<dispositions>${escapeXml(d)}</dispositions>`).join('\n  ');
          const soapBody = `<ser:addDispositionsToCampaign>
  <campaignName>${escapeXml(campaign)}</campaignName>
  ${dispoXml}
</ser:addDispositionsToCampaign>`;
          await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'addDispositionsToCampaign', soapBody);
          results.push({ target: campaign, targetType: 'campaign', success: true });
        } catch (err) {
          results.push({ target: campaign, targetType: 'campaign', success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      // Add to campaign profiles: first create groups, then add dispositions
      for (const profile of (campaignProfiles || [])) {
        // Step A: Create disposition groups
        if (dispositionGroups && dispositionGroups.length > 0) {
          try {
            const groupsXml = dispositionGroups.map(g => `<addDispositionGroups>${escapeXml(g)}</addDispositionGroups>`).join('\n  ');
            const soapBody = `<ser:modifyCampaignProfileDispositions>
  <profileName>${escapeXml(profile)}</profileName>
  ${groupsXml}
</ser:modifyCampaignProfileDispositions>`;
            await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'modifyCampaignProfileDispositions', soapBody);
            results.push({ target: `${profile} (groups)`, targetType: 'campaignProfileGroups', success: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
              results.push({ target: `${profile} (groups)`, targetType: 'campaignProfileGroups', success: true, error: 'Groups already exist (skipped)' });
            } else {
              results.push({ target: `${profile} (groups)`, targetType: 'campaignProfileGroups', success: false, error: msg });
            }
          }
        }

        // Step B: Add dispositions with optional group assignment
        if (profileDispositions && profileDispositions.length > 0) {
          try {
            const dispoCountsXml = profileDispositions.map(d => {
              const groupTag = d.group ? `\n    <groupName>${escapeXml(d.group)}</groupName>` : '';
              return `<addDispositionCounts>
    <disposition><name>${escapeXml(d.name)}</name></disposition>
    <count>-1</count>${groupTag}
  </addDispositionCounts>`;
            }).join('\n  ');
            const soapBody = `<ser:modifyCampaignProfileDispositions>
  <profileName>${escapeXml(profile)}</profileName>
  ${dispoCountsXml}
</ser:modifyCampaignProfileDispositions>`;
            await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'modifyCampaignProfileDispositions', soapBody);
            results.push({ target: profile, targetType: 'campaignProfile', success: true });
          } catch (err) {
            results.push({ target: profile, targetType: 'campaignProfile', success: false, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        }
      }

      responseData = { success: true, results };

    } else if (action === 'getPrompts') {
      const soapBody = `<ser:getPrompts/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getPrompts', soapBody);
      const prompts = [...new Set(extractValues(xml, 'name').filter(Boolean))];
      responseData = { success: true, prompts };

    } else if (action === 'getDispositions') {
      const soapBody = `<ser:getDispositions/>`;
      const xml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getDispositions', soapBody);
      const dispositions = [...new Set(extractValues(xml, 'name').filter(Boolean))];
      responseData = { success: true, dispositions };

    } else if (action === 'createInboundCampaign') {
      const { campaignName, description } = payload;
      const soapBody = `<ser:createInboundCampaign>
  <campaign>
    <name>${escapeXml(campaignName)}</name>
    <description>${escapeXml(description || '')}</description>
    <state>NOT_RUNNING</state>
  </campaign>
</ser:createInboundCampaign>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'createInboundCampaign', soapBody);
      responseData = { success: true };

    } else if (action === 'createSkill') {
      const { skillName } = payload;
      const soapBody = `<ser:createSkill>
  <skillInfo>
    <name>${escapeXml(skillName)}</name>
  </skillInfo>
</ser:createSkill>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'createSkill', soapBody);
      responseData = { success: true };

    } else if (action === 'createCampaignProfile') {
      const { profileName } = payload;
      const soapBody = `<ser:createCampaignProfile>
  <profile>
    <name>${escapeXml(profileName)}</name>
  </profile>
</ser:createCampaignProfile>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'createCampaignProfile', soapBody);
      responseData = { success: true };

    } else if (action === 'addSkillsToCampaign') {
      const { campaignName, skills } = payload;
      const skillsXml = (skills as string[]).map(s => `<skills>${escapeXml(s)}</skills>`).join('\n  ');
      const soapBody = `<ser:addSkillsToCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
  ${skillsXml}
</ser:addSkillsToCampaign>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'addSkillsToCampaign', soapBody);
      responseData = { success: true };

    } else if (action === 'addDNISToCampaign') {
      const { campaignName, dnisList } = payload;
      const results: Array<{ dnis: string; success: boolean; error?: string }> = [];
      for (const dnis of (dnisList as string[])) {
        try {
          const soapBody = `<ser:addDNISToCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
  <DNISList>
    <number>${escapeXml(dnis)}</number>
  </DNISList>
</ser:addDNISToCampaign>`;
          await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'addDNISToCampaign', soapBody);
          results.push({ dnis, success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.push({ dnis, success: false, error: msg });
        }
      }
      responseData = { success: true, results };

    } else if (action === 'getCampaignConfig') {
      // Fetch full campaign configuration for archiving snapshot
      const { campaignName } = payload;
      const config: Record<string, unknown> = {};

      // Get campaign DNIS
      try {
        const dnisBody = `<ser:getCampaignDNISList>
  <campaignName>${escapeXml(campaignName)}</campaignName>
</ser:getCampaignDNISList>`;
        const dnisXml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getCampaignDNISList', dnisBody);
        config.dnisList = extractValues(dnisXml, 'number');
      } catch { config.dnisList = []; }

      // Get campaign skills
      try {
        const skillsBody = `<ser:getInboundCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
</ser:getInboundCampaign>`;
        const skillsXml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getInboundCampaign', skillsBody);
        config.skills = extractValues(skillsXml, 'skillName');
        config.state = extractFirst(skillsXml, 'state');
        config.profileName = extractFirst(skillsXml, 'profileName');
        config.description = extractFirst(skillsXml, 'description');
      } catch { config.skills = []; }

      // Get campaign dispositions
      try {
        const dispoBody = `<ser:getCampaignDispositions>
  <campaignName>${escapeXml(campaignName)}</campaignName>
</ser:getCampaignDispositions>`;
        const dispoXml = await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'getCampaignDispositions', dispoBody);
        config.dispositions = extractValues(dispoXml, 'name');
      } catch { config.dispositions = []; }

      responseData = { success: true, config };

    } else if (action === 'removeDNISFromCampaign') {
      const { campaignName, dnisList } = payload;
      const results: Array<{ dnis: string; success: boolean; error?: string }> = [];
      for (const dnis of (dnisList as string[])) {
        try {
          const soapBody = `<ser:removeDNISFromCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
  <DNISList>
    <number>${escapeXml(dnis)}</number>
  </DNISList>
</ser:removeDNISFromCampaign>`;
          await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'removeDNISFromCampaign', soapBody);
          results.push({ dnis, success: true });
        } catch (err) {
          results.push({ dnis, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      responseData = { success: true, results };

    } else if (action === 'removeSkillsFromCampaign') {
      const { campaignName, skills } = payload;
      const skillsXml = (skills as string[]).map(s => `<skills>${escapeXml(s)}</skills>`).join('\n  ');
      const soapBody = `<ser:removeSkillsFromCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
  ${skillsXml}
</ser:removeSkillsFromCampaign>`;
      await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'removeSkillsFromCampaign', soapBody);
      responseData = { success: true };

    } else if (action === 'removeUsersFromSkill') {
      const { skillName, usernames } = payload;
      const results: Array<{ username: string; success: boolean; error?: string }> = [];
      for (const username of (usernames as string[])) {
        try {
          const soapBody = `<ser:removeSkillsFromUser>
  <username>${escapeXml(username)}</username>
  <skills>
    <skillName>${escapeXml(skillName)}</skillName>
  </skills>
</ser:removeSkillsFromUser>`;
          await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'removeSkillsFromUser', soapBody);
          results.push({ username, success: true });
        } catch (err) {
          results.push({ username, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      responseData = { success: true, results };

    } else if (action === 'stopCampaign') {
      const { campaignName } = payload;
      const soapBody = `<ser:stopCampaign>
  <campaignName>${escapeXml(campaignName)}</campaignName>
</ser:stopCampaign>`;
      try {
        await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'stopCampaign', soapBody);
        responseData = { success: true };
      } catch (err) {
        // Campaign might already be stopped
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('not running') || msg.toLowerCase().includes('already')) {
          responseData = { success: true, note: 'Campaign was already stopped' };
        } else {
          throw err;
        }
      }

    } else if (action === 'addRecordToList') {
      const { listName, record } = payload as {
        listName: string;
        record: Record<string, string>;
      };

      if (!listName || !record) {
        responseData = { success: false, error: 'listName and record are required for addRecordToList' };
      } else {
        const fieldsXml = Object.entries(record)
          .map(([name, value]) => `<fields><name>${escapeXml(name)}</name><value>${escapeXml(String(value))}</value></fields>`)
          .join('\n      ');

        const soapBody = `<ser:addRecordToList>
  <listName>${escapeXml(listName)}</listName>
  <record>
      ${fieldsXml}
  </record>
</ser:addRecordToList>`;
        await soapCall(FIVE9_USERNAME, FIVE9_PASSWORD, 'addRecordToList', soapBody);
        responseData = { success: true };
      }

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
