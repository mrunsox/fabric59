import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-webhook-secret, x-five9-domain, x-partner-id, x-client-id',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Direction = "inbound" | "outbound";

interface CallEvent {
  id: string;
  direction: Direction;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  fromNumber: string;
  toNumber: string;
  agentId?: string;
  agentName?: string;
  queue?: string;
  campaign?: string;
  disposition?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  raw: any;
}

interface Five9ToCrmRules {
  enabled: boolean;
  autoCreateContact: boolean;
  autoCreateMatterOrCase: boolean;
  autoCreateOnlyForQueues?: string[];
  attachToLatestOpenOnly: boolean;
  fallbackToContactOnly: boolean;
  createTimeEntryForBillable: boolean;
  perQueueOverrides?: Record<string, Partial<Five9ToCrmRules>>;
}

interface ClioIntegrationConfig {
  enabled: boolean;
  webhookSecret?: string;
  oauthTokenId?: string;
  rules: Five9ToCrmRules;
}

interface MyCaseIntegrationConfig {
  enabled: boolean;
  webhookSecret?: string;
  authType?: "api_key" | "oauth2";
  apiKeyId?: string;
  oauthTokenId?: string;
  rules: Five9ToCrmRules;
}

interface GenericCrmConfig {
  api_url?: string;
  api_key?: string;
}

interface IntegrationConfigs {
  clio?: ClioIntegrationConfig;
  mycase?: MyCaseIntegrationConfig;
  crm?: GenericCrmConfig;
}

interface ResolvedContext {
  tenantId: string;
  orgId: string;
  partnerId?: string;
  domainId?: string;
  configs: IntegrationConfigs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

function mergeRules(base: Five9ToCrmRules, queue?: string): Five9ToCrmRules {
  if (!queue || !base.perQueueOverrides?.[queue]) return base;
  return { ...base, ...base.perQueueOverrides[queue] };
}

function normalizeCallEvent(payload: any): CallEvent {
  const direction: Direction = (payload.direction || payload.callType || '').toLowerCase().includes('outbound') ? 'outbound' : 'inbound';
  return {
    id: payload.callId || payload.call_id || payload.id || crypto.randomUUID(),
    direction,
    startedAt: payload.startedAt || payload.start_time || payload.timestamp || new Date().toISOString(),
    endedAt: payload.endedAt || payload.end_time,
    durationSeconds: payload.durationSeconds || payload.duration || payload.call_duration_seconds,
    fromNumber: payload.fromNumber || payload.ani || payload.from || '',
    toNumber: payload.toNumber || payload.dnis || payload.to || '',
    agentId: payload.agentId || payload.agent_id,
    agentName: payload.agentName || payload.agent_name,
    queue: payload.queue || payload.skill || payload.skillName,
    campaign: payload.campaign || payload.campaignName,
    disposition: payload.disposition || payload.dispositionName,
    recordingUrl: payload.recordingUrl || payload.recording_url,
    transcriptUrl: payload.transcriptUrl || payload.transcript_url,
    raw: payload,
  };
}

// ─── Clio OAuth Token Helper ─────────────────────────────────────────────────

async function getClioAccessToken(
  supabase: any,
  oauthTokenId: string
): Promise<string | null> {
  const { data: token } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('id', oauthTokenId)
    .eq('provider', 'clio')
    .single();

  if (!token) return null;

  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now() + 300_000) {
    const clioClientId = Deno.env.get('CLIO_CLIENT_ID');
    const clioClientSecret = Deno.env.get('CLIO_CLIENT_SECRET');
    if (!clioClientId || !clioClientSecret || !token.refresh_token_encrypted) {
      console.error('Cannot refresh Clio token: missing credentials');
      return token.access_token_encrypted;
    }

    try {
      const res = await fetch('https://app.clio.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token_encrypted,
          client_id: clioClientId,
          client_secret: clioClientSecret,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await supabase.from('oauth_tokens').update({
          access_token_encrypted: data.access_token,
          refresh_token_encrypted: data.refresh_token || token.refresh_token_encrypted,
          expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
        }).eq('id', oauthTokenId);
        return data.access_token;
      }
    } catch (e) {
      console.error('Clio token refresh failed:', e);
    }
  }

  return token.access_token_encrypted;
}

// ─── Clio API helpers ────────────────────────────────────────────────────────

async function clioApiFetch(
  method: string,
  path: string,
  accessToken: string,
  body?: any
): Promise<any> {
  const baseUrl = 'https://app.clio.com/api/v4';
  const opts: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${baseUrl}${path}`, opts);
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return { ok: res.ok, status: res.status, data: await res.json() };
  }
  return { ok: false, status: 0, data: { error: 'Max retries exceeded' } };
}

// ─── handleCallForClio ───────────────────────────────────────────────────────

async function handleCallForClio(params: {
  tenantId: string;
  orgId: string;
  call: CallEvent;
  config: ClioIntegrationConfig;
  supabase: any;
}): Promise<{ contactId?: string; matterId?: string; communicationId?: string; error?: string }> {
  const { tenantId, orgId, call, config, supabase } = params;

  if (!config.oauthTokenId) return { error: 'No Clio OAuth token configured' };

  const accessToken = await getClioAccessToken(supabase, config.oauthTokenId);
  if (!accessToken) return { error: 'Could not obtain Clio access token' };

  const rules = mergeRules(config.rules, call.queue);
  const clientPhone = call.direction === 'inbound' ? call.fromNumber : call.toNumber;
  const normalizedPhone = normalizePhone(clientPhone);

  let contactId: string | undefined;
  let matterId: string | undefined;

  const { data: mapping } = await supabase
    .from('clio_mappings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (mapping) {
    contactId = mapping.contact_id;
    matterId = mapping.matter_id;
  } else {
    const searchRes = await clioApiFetch('GET', `/contacts.json?query=${encodeURIComponent(normalizedPhone)}&type=Person`, accessToken);
    if (searchRes.ok && searchRes.data?.data?.length > 0) {
      contactId = String(searchRes.data.data[0].id);
      await supabase.from('clio_mappings').insert({
        tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone, contact_id: contactId,
      });
    } else if (rules.autoCreateContact) {
      const createRes = await clioApiFetch('POST', '/contacts.json', accessToken, {
        data: {
          type: 'Person',
          first_name: call.raw?.callerName || 'Unknown',
          last_name: call.raw?.callerLastName || 'Caller',
          phone_numbers: [{ name: 'Work', number: normalizedPhone, default_number: true }],
        },
      });
      if (createRes.ok) {
        contactId = String(createRes.data.data.id);
        await supabase.from('clio_mappings').insert({
          tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone, contact_id: contactId,
        });
      }
    }
  }

  if (contactId && !matterId) {
    const mattersRes = await clioApiFetch('GET', `/matters.json?contact_id=${contactId}&status=open&order=created_at(desc)`, accessToken);
    if (mattersRes.ok && mattersRes.data?.data?.length > 0) {
      matterId = rules.attachToLatestOpenOnly
        ? String(mattersRes.data.data[0].id)
        : String(mattersRes.data.data[mattersRes.data.data.length - 1].id);
    } else if (rules.autoCreateMatterOrCase) {
      const queueAllowed = !rules.autoCreateOnlyForQueues?.length || (call.queue && rules.autoCreateOnlyForQueues.includes(call.queue));
      if (queueAllowed) {
        const matterRes = await clioApiFetch('POST', '/matters.json', accessToken, {
          data: {
            description: `Intake from Five9 – ${call.queue || 'General'}`,
            status: 'open',
            client: { id: Number(contactId) },
          },
        });
        if (matterRes.ok) {
          matterId = String(matterRes.data.data.id);
        }
      }
    }

    if (matterId && mapping) {
      await supabase.from('clio_mappings').update({ matter_id: matterId }).eq('id', mapping.id);
    } else if (matterId) {
      await supabase.from('clio_mappings').upsert({
        tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone,
        contact_id: contactId, matter_id: matterId,
      }, { onConflict: 'tenant_id,phone' });
    }
  }

  const commBody: any = {
    data: {
      type: 'PhoneCall',
      subject: `Five9 ${call.direction} call – ${call.queue || 'N/A'}`,
      body: [
        `Direction: ${call.direction}`,
        `From: ${call.fromNumber} → To: ${call.toNumber}`,
        `Agent: ${call.agentName || 'N/A'}`,
        `Queue: ${call.queue || 'N/A'} | Campaign: ${call.campaign || 'N/A'}`,
        `Disposition: ${call.disposition || 'N/A'}`,
        `Duration: ${call.durationSeconds ? `${Math.round(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : 'N/A'}`,
        call.recordingUrl ? `Recording: ${call.recordingUrl}` : null,
        call.transcriptUrl ? `Transcript: ${call.transcriptUrl}` : null,
      ].filter(Boolean).join('\n'),
      date: call.startedAt,
      received_at: call.startedAt,
    },
  };

  if (contactId) commBody.data.senders = [{ id: Number(contactId), type: 'Contact' }];
  if (matterId) commBody.data.matter = { id: Number(matterId) };

  const commRes = await clioApiFetch('POST', '/communications.json', accessToken, commBody);
  const communicationId = commRes.ok ? String(commRes.data?.data?.id) : undefined;

  if (rules.createTimeEntryForBillable && matterId && call.durationSeconds) {
    await clioApiFetch('POST', '/activities.json', accessToken, {
      data: {
        type: 'TimeEntry',
        quantity: Math.max(call.durationSeconds, 60) / 3600,
        date: call.startedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        note: `Five9 phone call – ${call.disposition || call.queue || 'General'}`,
        matter: { id: Number(matterId) },
      },
    });
  }

  return { contactId, matterId, communicationId };
}

// ─── MyCase API helper ───────────────────────────────────────────────────────

async function mycaseApiFetch(
  method: string,
  path: string,
  apiKey: string,
  body?: any
): Promise<any> {
  const baseUrl = 'https://api.mycase.com/v2';
  const opts: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${baseUrl}${path}`, opts);
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return { ok: res.ok, status: res.status, data: await res.json() };
  }
  return { ok: false, status: 0, data: { error: 'Max retries exceeded' } };
}

// ─── handleCallForMyCase ─────────────────────────────────────────────────────

async function handleCallForMyCase(params: {
  tenantId: string;
  orgId: string;
  call: CallEvent;
  config: MyCaseIntegrationConfig;
  supabase: any;
}): Promise<{ contactId?: string; caseId?: string; noteId?: string; error?: string }> {
  const { tenantId, orgId, call, config, supabase } = params;

  let apiKey: string | null = null;
  if (config.apiKeyId) {
    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('key_hash')
      .eq('id', config.apiKeyId)
      .single();
    apiKey = keyRow?.key_hash || null;
  }
  if (!apiKey) return { error: 'No MyCase API key configured' };

  const rules = mergeRules(config.rules, call.queue);
  const clientPhone = call.direction === 'inbound' ? call.fromNumber : call.toNumber;
  const normalizedPhone = normalizePhone(clientPhone);

  let contactId: string | undefined;
  let caseId: string | undefined;

  const { data: mapping } = await supabase
    .from('mycase_mappings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (mapping) {
    contactId = mapping.contact_id;
    caseId = mapping.case_id;
  } else {
    const searchRes = await mycaseApiFetch('GET', `/contacts?phone=${encodeURIComponent(normalizedPhone)}`, apiKey);
    if (searchRes.ok && searchRes.data?.contacts?.length > 0) {
      contactId = String(searchRes.data.contacts[0].id);
      await supabase.from('mycase_mappings').insert({
        tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone, contact_id: contactId,
      });
    } else if (rules.autoCreateContact) {
      const createRes = await mycaseApiFetch('POST', '/contacts', apiKey, {
        contact: {
          first_name: call.raw?.callerName || 'Unknown',
          last_name: call.raw?.callerLastName || 'Caller',
          phone: normalizedPhone,
        },
      });
      if (createRes.ok) {
        contactId = String(createRes.data?.contact?.id);
        await supabase.from('mycase_mappings').insert({
          tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone, contact_id: contactId,
        });
      }
    }
  }

  if (contactId && !caseId) {
    const casesRes = await mycaseApiFetch('GET', `/cases?contact_id=${contactId}&status=open`, apiKey);
    if (casesRes.ok && casesRes.data?.cases?.length > 0) {
      caseId = rules.attachToLatestOpenOnly
        ? String(casesRes.data.cases[0].id)
        : String(casesRes.data.cases[casesRes.data.cases.length - 1].id);
    } else if (rules.autoCreateMatterOrCase) {
      const queueAllowed = !rules.autoCreateOnlyForQueues?.length || (call.queue && rules.autoCreateOnlyForQueues.includes(call.queue));
      if (queueAllowed) {
        const caseRes = await mycaseApiFetch('POST', '/cases', apiKey, {
          case: {
            name: `Intake from Five9 – ${call.queue || 'General'}`,
            contact_id: Number(contactId),
          },
        });
        if (caseRes.ok) {
          caseId = String(caseRes.data?.case?.id);
        }
      }
    }

    if (caseId && mapping) {
      await supabase.from('mycase_mappings').update({ case_id: caseId }).eq('id', mapping.id);
    } else if (caseId) {
      await supabase.from('mycase_mappings').upsert({
        tenant_id: tenantId, organization_id: orgId, phone: normalizedPhone,
        contact_id: contactId, case_id: caseId,
      }, { onConflict: 'tenant_id,phone' });
    }
  }

  const noteBody = [
    `Direction: ${call.direction}`,
    `From: ${call.fromNumber} → To: ${call.toNumber}`,
    `Agent: ${call.agentName || 'N/A'}`,
    `Queue: ${call.queue || 'N/A'} | Campaign: ${call.campaign || 'N/A'}`,
    `Disposition: ${call.disposition || 'N/A'}`,
    `Duration: ${call.durationSeconds ? `${Math.round(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : 'N/A'}`,
    call.recordingUrl ? `Recording: ${call.recordingUrl}` : null,
    call.transcriptUrl ? `Transcript: ${call.transcriptUrl}` : null,
  ].filter(Boolean).join('\n');

  const notePayload: any = {
    note: {
      subject: `Five9 Phone Call – ${call.direction} – ${call.startedAt}`,
      content: noteBody,
    },
  };
  if (caseId) notePayload.note.case_id = Number(caseId);
  else if (contactId && rules.fallbackToContactOnly) notePayload.note.contact_id = Number(contactId);

  const noteRes = await mycaseApiFetch('POST', '/notes', apiKey, notePayload);
  const noteId = noteRes.ok ? String(noteRes.data?.note?.id) : undefined;

  return { contactId, caseId, noteId };
}

// ─── Web Callback Writeback (from five9-webhook) ────────────────────────────

async function handleWebCallbackWriteback(
  supabase: any,
  orgId: string,
  eventType: string,
  data: any
): Promise<void> {
  if (eventType !== 'call_ended' && eventType !== 'disposition_set' && eventType !== 'web_callback_result') {
    return;
  }

  const callbackId = data?.callback_id;
  const five9CallId = data?.call_id || data?.five9_call_id;
  const phone = data?.phone || data?.ani;

  if (!callbackId && !five9CallId && !phone) return;

  let query = supabase.from('web_callbacks').select('id').eq('organization_id', orgId);
  if (callbackId) {
    query = query.eq('id', callbackId);
  } else if (five9CallId) {
    query = query.eq('five9_call_id', five9CallId);
  } else if (phone) {
    query = query.eq('contact_phone', phone).in('status', ['pending', 'dialing']);
  }

  const { data: callbacks } = await query.limit(1);
  if (!callbacks || callbacks.length === 0) return;

  const updateData: Record<string, unknown> = {};
  if (data?.disposition) updateData.call_disposition = data.disposition;
  if (data?.duration || data?.call_duration_seconds) updateData.call_duration_seconds = data.duration || data.call_duration_seconds;
  if (data?.recording_url) updateData.recording_url = data.recording_url;
  if (five9CallId) updateData.five9_call_id = five9CallId;

  const callStatus = data?.call_status || data?.status;
  if (callStatus === 'completed' || data?.disposition) {
    updateData.status = 'completed';
  } else if (callStatus === 'no_answer') {
    updateData.status = 'no_answer';
  } else if (callStatus === 'failed' || callStatus === 'error') {
    updateData.status = 'failed';
  }

  if (Object.keys(updateData).length > 0) {
    await supabase.from('web_callbacks').update(updateData).eq('id', callbacks[0].id);
  }
}

// ─── Downstream Notification Triggering (from five9-webhook) ─────────────────

async function handleDownstreamNotifications(
  supabase: any,
  domainId: string,
  eventType: string,
  data: any
): Promise<void> {
  if (eventType !== 'call_ended' && eventType !== 'disposition_set') return;

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, notification_triggers')
    .eq('five9_domain_id', domainId);

  for (const tenant of (tenants || [])) {
    const triggers = tenant.notification_triggers as Record<string, boolean> | null;
    if (triggers?.[eventType]) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ tenant_id: tenant.id, event_type: eventType, data }),
      }).catch(e => console.error('Notification fire-and-forget error:', e));
    }
  }
}

// ─── Context Resolution ──────────────────────────────────────────────────────

/**
 * Resolves the request context using one of two routing paths:
 *
 * Route A: x-tenant-id header → direct tenant identification
 * Route B: x-five9-domain header → domain-level, resolves org + tenants
 */
async function resolveContext(
  req: Request,
  supabase: any
): Promise<{ context?: ResolvedContext; domainRoute?: { domainId: string; orgId: string }; error?: string; status?: number }> {
  const tenantId = req.headers.get('x-tenant-id');
  const domainHeader = req.headers.get('x-five9-domain');
  const webhookSecret = req.headers.get('x-webhook-secret');

  // Route A: Direct tenant identification
  if (tenantId) {
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .select('id, organization_id, integration_configs')
      .eq('id', tenantId)
      .single();

    if (tErr || !tenant) {
      return { error: 'Tenant not found', status: 404 };
    }

    const configs: IntegrationConfigs = (tenant.integration_configs as any) || {};

    // Validate webhook secret against configured secrets
    if (webhookSecret) {
      const validClio = configs.clio?.webhookSecret === webhookSecret;
      const validMycase = configs.mycase?.webhookSecret === webhookSecret;
      if (!validClio && !validMycase) {
        return { error: 'Invalid webhook secret', status: 403 };
      }
    }

    return {
      context: {
        tenantId: tenant.id,
        orgId: tenant.organization_id,
        configs,
      },
    };
  }

  // Route B: Domain-level identification (merged from five9-webhook)
  if (domainHeader) {
    if (!webhookSecret) {
      return { error: 'Missing x-webhook-secret header for domain routing', status: 401 };
    }

    const { data: domain, error: dErr } = await supabase
      .from('five9_domains')
      .select('id, organization_id, webhook_secret')
      .eq('domain', domainHeader)
      .single();

    if (dErr || !domain || domain.webhook_secret !== webhookSecret) {
      return { error: 'Invalid domain or webhook secret', status: 403 };
    }

    return {
      domainRoute: {
        domainId: domain.id,
        orgId: domain.organization_id,
      },
    };
  }

  return { error: 'Missing x-tenant-id or x-five9-domain header', status: 400 };
}

// ─── CRM Dispatch to crm-push for non-Legal CRMs ────────────────────────────

async function dispatchToGenericCrm(
  supabase: any,
  tenantId: string,
  crmAction: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/crm-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, crm_action: crmAction, data }),
    });
  } catch (e) {
    console.error('crm-push dispatch error:', e);
  }
}

// ─── Main Server ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { context, domainRoute, error, status } = await resolveContext(req, supabase);

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const startTime = Date.now();

    // ── Route B: Domain-level event processing ──
    if (domainRoute) {
      const { domainId, orgId } = domainRoute;
      const eventType = payload.event_type;
      const eventData = payload.data || payload;

      // Log the webhook event
      await supabase.from('api_logs').insert({
        endpoint: `five9-main/domain/${eventType || 'unknown'}`,
        method: 'POST',
        status: 'success',
        request_payload: payload,
        response: { received: true },
        response_time_ms: 0,
      });

      // Web callback writeback
      await handleWebCallbackWriteback(supabase, orgId, eventType, eventData);

      // Downstream notifications
      await handleDownstreamNotifications(supabase, domainId, eventType, eventData);

      // Also process CRM for tenants under this domain
      if (eventType === 'call_ended' || eventType === 'disposition_set') {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, organization_id, integration_configs')
          .eq('five9_domain_id', domainId);

        const call = normalizeCallEvent(eventData);

        for (const tenant of (tenants || [])) {
          const configs: IntegrationConfigs = (tenant.integration_configs as any) || {};

          if (configs.clio?.enabled && configs.clio.rules?.enabled) {
            try {
              await handleCallForClio({
                tenantId: tenant.id, orgId, call, config: configs.clio, supabase,
              });
            } catch (e) {
              console.error(`Clio error for tenant ${tenant.id}:`, e);
            }
          }

          if (configs.mycase?.enabled && configs.mycase.rules?.enabled) {
            try {
              await handleCallForMyCase({
                tenantId: tenant.id, orgId, call, config: configs.mycase, supabase,
              });
            } catch (e) {
              console.error(`MyCase error for tenant ${tenant.id}:`, e);
            }
          }

          // Generic CRM dispatch for non-legal CRMs
          const hasLegalCrm = configs.clio?.enabled || configs.mycase?.enabled;
          if (!hasLegalCrm && configs.crm?.api_url) {
            dispatchToGenericCrm(supabase, tenant.id, 'log_call', {
              callId: call.id, direction: call.direction, fromNumber: call.fromNumber,
              toNumber: call.toNumber, agentName: call.agentName, queue: call.queue,
              campaign: call.campaign, disposition: call.disposition,
              durationSeconds: call.durationSeconds,
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Route A: Direct tenant CRM processing ──
    if (context) {
      const call = normalizeCallEvent(payload);
      const results: any = { tenantId: context.tenantId, callId: call.id };

      // Handle Clio
      if (context.configs.clio?.enabled && context.configs.clio.rules?.enabled) {
        try {
          results.clio = await handleCallForClio({
            tenantId: context.tenantId, orgId: context.orgId, call, config: context.configs.clio, supabase,
          });
        } catch (e) {
          results.clio = { error: e instanceof Error ? e.message : 'Clio handler error' };
        }
      }

      // Handle MyCase
      if (context.configs.mycase?.enabled && context.configs.mycase.rules?.enabled) {
        try {
          results.mycase = await handleCallForMyCase({
            tenantId: context.tenantId, orgId: context.orgId, call, config: context.configs.mycase, supabase,
          });
        } catch (e) {
          results.mycase = { error: e instanceof Error ? e.message : 'MyCase handler error' };
        }
      }

      const elapsed = Date.now() - startTime;

      // Log to api_logs
      await supabase.from('api_logs').insert({
        tenant_id: context.tenantId,
        endpoint: 'five9-main',
        method: 'POST',
        status: (results.clio?.error || results.mycase?.error) ? 'error' : 'success',
        request_payload: { callId: call.id, direction: call.direction, queue: call.queue },
        response: results,
        response_time_ms: elapsed,
      });

      return new Response(JSON.stringify({ success: true, ...results }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No routing context resolved' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('five9-main error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
