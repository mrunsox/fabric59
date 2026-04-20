import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { resolveLegacyConnection } from "../_shared/legacy-config-bridge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Clio webhook limits
const CLIO_MAX_WEBHOOK_DAYS = 31;
const CLIO_RENEW_THRESHOLD_DAYS = 25;
const MAX_RENEWAL_FAILURES_BEFORE_RECREATE = 3;

const NON_RETRYABLE = new Set([
  "invalid_signature",
  "unsupported_action",
  "payload_validation_failed",
  "duplicate_event",
]);

function getBackoffMs(attempt: number): number {
  return Math.min(10_000 * Math.pow(3, attempt), 900_000);
}

function classifyFailure(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("429")) return "rate_limited";
  if (lower.includes("timeout") || lower.includes("econnreset")) return "transient_network_error";
  if (lower.includes("unauthorized") || lower.includes("401")) return "token_refresh_failed";
  if (lower.includes("not found") || lower.includes("404")) return "provider_unavailable";
  if (lower.includes("unsupported")) return "unsupported_action";
  if (lower.includes("validation")) return "payload_validation_failed";
  if (lower.includes("502") || lower.includes("503") || lower.includes("504")) return "provider_unavailable";
  return "internal_processing_error";
}

function computeHealthStatus(sub: Record<string, unknown>): string {
  if (sub.status === "disabled") return "disabled";
  const expiresAt = sub.expires_at ? new Date(sub.expires_at as string) : null;
  const failureCount = (sub.failure_count as number) ?? 0;

  if (expiresAt && expiresAt < new Date()) return "expired";
  if (failureCount >= 5) return "critical";
  if (expiresAt) {
    const daysRemaining = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysRemaining <= 2) return "critical";
    if (daysRemaining <= 5 || failureCount >= 2) return "degraded";
  }
  if (failureCount >= 2) return "degraded";
  return "healthy";
}

// ─── CRM API Helpers (extracted from five9-main patterns) ────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function apiFetchWithRetry(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
  maxRetries = 3
): Promise<{ ok: boolean; status: number; data: any }> {
  const opts: RequestInit = { method, headers: { ...headers, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return { ok: res.ok, status: res.status, data: await res.json() };
  }
  return { ok: false, status: 0, data: { error: "Max retries exceeded" } };
}

async function getClioAccessToken(supabase: any, oauthTokenId: string): Promise<string | null> {
  const { data: token } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("id", oauthTokenId)
    .eq("provider", "clio")
    .single();

  if (!token) return null;

  // Check if token needs refresh (within 5 minutes of expiry)
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now() + 300_000) {
    // For per-client Clio credentials, we need to look up the connection's client_id/secret
    // from the tenant's integration_configs or a dedicated credentials store
    // For now, attempt refresh if we have the refresh token
    if (token.refresh_token_encrypted) {
      try {
        // Look up Clio app credentials from the connection that owns this token
        const { data: conn } = await supabase
          .from("legal_connect_connections")
          .select("config")
          .eq("oauth_token_id", oauthTokenId)
          .maybeSingle();

        const clioClientId = conn?.config?.client_id;
        const clioClientSecret = conn?.config?.client_secret;

        if (clioClientId && clioClientSecret) {
          const res = await fetch("https://app.clio.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: token.refresh_token_encrypted,
              client_id: clioClientId,
              client_secret: clioClientSecret,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            await supabase
              .from("oauth_tokens")
              .update({
                access_token_encrypted: data.access_token,
                refresh_token_encrypted: data.refresh_token || token.refresh_token_encrypted,
                expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
              })
              .eq("id", oauthTokenId);
            return data.access_token;
          }
        }
      } catch (e) {
        console.error("Clio token refresh failed:", e);
      }
    }
  }

  return token.access_token_encrypted;
}

async function getMyCaseApiKey(supabase: any, apiKeyId: string): Promise<string | null> {
  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("key_hash")
    .eq("id", apiKeyId)
    .single();
  return keyRow?.key_hash || null;
}

// ─── CRM Job Executors ──────────────────────────────────────────────────────

async function executeClioJob(
  supabase: any,
  job: any,
  tenantConfigs: any
): Promise<{ status: string; output: any }> {
  const clioConfig = tenantConfigs?.clio;
  if (!clioConfig?.oauthTokenId) {
    throw new Error("No Clio OAuth token configured for this tenant");
  }

  const accessToken = await getClioAccessToken(supabase, clioConfig.oauthTokenId);
  if (!accessToken) throw new Error("Could not obtain Clio access token");

  const baseUrl = "https://app.clio.com/api/v4";
  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const input = job.input_payload || {};
  const jobType = job.job_type;

  if (jobType === "contact.search" || jobType === "contact.lookup") {
    const phone = normalizePhone(input.phone || input.ani || "");
    const res = await apiFetchWithRetry("GET", `${baseUrl}/contacts.json?query=${encodeURIComponent(phone)}&type=Person`, authHeaders);
    return { status: "succeeded", output: { contacts: res.data?.data || [], found: (res.data?.data?.length || 0) > 0 } };
  }

  if (jobType === "contact.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/contacts.json`, authHeaders, {
      data: {
        type: "Person",
        first_name: input.first_name || "Unknown",
        last_name: input.last_name || "Caller",
        phone_numbers: input.phone ? [{ name: "Work", number: normalizePhone(input.phone), default_number: true }] : [],
      },
    });
    if (!res.ok) throw new Error(`Clio contact create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { contact_id: res.data?.data?.id } };
  }

  if (jobType === "matter.resolve" || jobType === "matter.search") {
    const contactId = input.contact_id;
    if (!contactId) throw new Error("contact_id required for matter resolution");
    const res = await apiFetchWithRetry("GET", `${baseUrl}/matters.json?contact_id=${contactId}&status=open&order=created_at(desc)`, authHeaders);
    const matters = res.data?.data || [];
    return { status: "succeeded", output: { matters, matter_id: matters[0]?.id || null } };
  }

  if (jobType === "matter.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/matters.json`, authHeaders, {
      data: {
        description: input.description || "Intake from Five9",
        status: "open",
        client: input.contact_id ? { id: Number(input.contact_id) } : undefined,
      },
    });
    if (!res.ok) throw new Error(`Clio matter create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { matter_id: res.data?.data?.id } };
  }

  if (jobType === "communication.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/communications.json`, authHeaders, {
      data: {
        type: "PhoneCall",
        subject: input.subject || "Five9 Phone Call",
        body: input.body || "",
        date: input.date || new Date().toISOString(),
        received_at: input.received_at || new Date().toISOString(),
        ...(input.contact_id ? { senders: [{ id: Number(input.contact_id), type: "Contact" }] } : {}),
        ...(input.matter_id ? { matter: { id: Number(input.matter_id) } } : {}),
      },
    });
    if (!res.ok) throw new Error(`Clio communication create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { communication_id: res.data?.data?.id } };
  }

  if (jobType === "activity.create" || jobType === "time_entry.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/activities.json`, authHeaders, {
      data: {
        type: "TimeEntry",
        quantity: input.quantity || 0.1,
        date: input.date || new Date().toISOString().split("T")[0],
        note: input.note || "Five9 phone call",
        ...(input.matter_id ? { matter: { id: Number(input.matter_id) } } : {}),
      },
    });
    if (!res.ok) throw new Error(`Clio activity create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { activity_id: res.data?.data?.id } };
  }

  throw new Error(`Unsupported Clio job type: ${jobType}`);
}

async function executeMyCaseJob(
  supabase: any,
  job: any,
  tenantConfigs: any
): Promise<{ status: string; output: any }> {
  const mycaseConfig = tenantConfigs?.mycase;
  if (!mycaseConfig?.apiKeyId) {
    throw new Error("No MyCase API key configured for this tenant");
  }

  const apiKey = await getMyCaseApiKey(supabase, mycaseConfig.apiKeyId);
  if (!apiKey) throw new Error("Could not retrieve MyCase API key");

  const baseUrl = "https://api.mycase.com/v2";
  const authHeaders = { Authorization: `Bearer ${apiKey}` };
  const input = job.input_payload || {};
  const jobType = job.job_type;

  if (jobType === "contact.search" || jobType === "contact.lookup") {
    const phone = normalizePhone(input.phone || input.ani || "");
    const res = await apiFetchWithRetry("GET", `${baseUrl}/contacts?phone=${encodeURIComponent(phone)}`, authHeaders);
    return { status: "succeeded", output: { contacts: res.data?.contacts || [], found: (res.data?.contacts?.length || 0) > 0 } };
  }

  if (jobType === "contact.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/contacts`, authHeaders, {
      contact: {
        first_name: input.first_name || "Unknown",
        last_name: input.last_name || "Caller",
        phone: input.phone ? normalizePhone(input.phone) : undefined,
      },
    });
    if (!res.ok) throw new Error(`MyCase contact create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { contact_id: res.data?.contact?.id } };
  }

  if (jobType === "case.search" || jobType === "matter.resolve" || jobType === "matter.search") {
    const contactId = input.contact_id;
    if (!contactId) throw new Error("contact_id required for case search");
    const res = await apiFetchWithRetry("GET", `${baseUrl}/cases?contact_id=${contactId}&status=open`, authHeaders);
    const cases = res.data?.cases || [];
    return { status: "succeeded", output: { cases, case_id: cases[0]?.id || null } };
  }

  if (jobType === "case.create" || jobType === "matter.create") {
    const res = await apiFetchWithRetry("POST", `${baseUrl}/cases`, authHeaders, {
      case: {
        name: input.name || input.description || "Intake from Five9",
        contact_id: input.contact_id ? Number(input.contact_id) : undefined,
      },
    });
    if (!res.ok) throw new Error(`MyCase case create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { case_id: res.data?.case?.id } };
  }

  if (jobType === "note.create" || jobType === "communication.create") {
    const notePayload: any = {
      note: {
        subject: input.subject || "Five9 Phone Call",
        content: input.body || input.content || "",
      },
    };
    if (input.case_id) notePayload.note.case_id = Number(input.case_id);
    else if (input.contact_id) notePayload.note.contact_id = Number(input.contact_id);

    const res = await apiFetchWithRetry("POST", `${baseUrl}/notes`, authHeaders, notePayload);
    if (!res.ok) throw new Error(`MyCase note create failed [${res.status}]: ${JSON.stringify(res.data)}`);
    return { status: "succeeded", output: { note_id: res.data?.note?.id } };
  }

  throw new Error(`Unsupported MyCase job type: ${jobType}`);
}

async function callSmokeballAction(
  clientId: string,
  action: string,
  payload: any,
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/smokeball`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "x-tenant-id": clientId,
    },
    body: JSON.stringify({ action, payload }),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

async function executeSmokeballJob(
  job: any,
): Promise<{ status: string; output: any }> {
  const input = job.input_payload || {};
  const jobType = job.job_type;
  const clientId = job.client_id;

  if (jobType === "contact.search" || jobType === "contact.lookup") {
    const r = await callSmokeballAction(clientId, "searchContact", { phone: input.phone || input.ani, email: input.email });
    if (!r.ok) throw new Error(r.data?.error || "smokeball search failed");
    const list = r.data?.data || [];
    return { status: "succeeded", output: { contacts: list, found: list.length > 0 } };
  }
  if (jobType === "contact.create") {
    const r = await callSmokeballAction(clientId, "createContact", {
      first_name: input.first_name || "Unknown",
      last_name: input.last_name || "Caller",
      phone: input.phone,
      email: input.email,
    });
    if (!r.ok) throw new Error(r.data?.error || "smokeball contact create failed");
    return { status: "succeeded", output: { contact_id: r.data?.data?.provider_id } };
  }
  if (jobType === "matter.create") {
    const r = await callSmokeballAction(clientId, "createMatter", {
      description: input.description || "Intake from Five9",
      contact_id: input.contact_id,
    });
    if (!r.ok) throw new Error(r.data?.error || "smokeball matter create failed");
    return { status: "succeeded", output: { matter_id: r.data?.data?.provider_id } };
  }
  if (jobType === "note.create" || jobType === "communication.create") {
    const r = await callSmokeballAction(clientId, "createNote", {
      subject: input.subject || "Five9 Phone Call",
      content: input.body || input.content || "",
      contact_id: input.contact_id,
      matter_id: input.matter_id,
    });
    if (!r.ok) throw new Error(r.data?.error || "smokeball note create failed");
    return { status: "succeeded", output: { note_id: r.data?.data?.provider_id } };
  }
  throw new Error(`Unsupported Smokeball job type: ${jobType}`);
}

async function executeJob(
  supabase: any,
  job: any
): Promise<{ status: string; output: any }> {
  const provider = (job.provider || "").toLowerCase();

  // 1) Prefer legal_connect_connections (new path)
  let connection: any = null;
  if (job.connection_id) {
    const { data } = await supabase
      .from("legal_connect_connections")
      .select("*")
      .eq("id", job.connection_id)
      .maybeSingle();
    connection = data;
  }
  if (!connection) {
    const { data } = await supabase
      .from("legal_connect_connections")
      .select("*")
      .eq("client_id", job.client_id)
      .eq("provider", provider)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    connection = data;
  }

  // 2) For Smokeball, dispatch via registry using the connection's tokens
  if (provider === "smokeball") {
    if (!connection) throw new Error("No Smokeball connection found for this client");
    let access_token: string | undefined;
    if (connection.oauth_token_id) {
      const { data: tok } = await supabase
        .from("oauth_tokens")
        .select("access_token_encrypted, refresh_token_encrypted, expires_at")
        .eq("id", connection.oauth_token_id)
        .maybeSingle();
      access_token = tok?.access_token_encrypted;
    }
    const ctx: AdapterConnectionContext = {
      connection_id: connection.id,
      client_id: connection.client_id,
      organization_id: connection.organization_id,
      provider: "smokeball",
      access_token,
      region: connection.region ?? "US",
      base_url: connection.base_url,
      metadata: connection.metadata ?? {},
    };
    return await executeSmokeballJob(supabase, job, ctx);
  }

  // 3) Clio / MyCase — keep existing executors but resolve config via legacy bridge fallback
  let configs: any;
  const { data: tenant } = await supabase
    .from("tenants")
    .select("integration_configs")
    .eq("id", job.client_id)
    .single();
  configs = (tenant?.integration_configs as any) || {};

  // If no legacy block AND no legal_connect_connections row, surface the bridge result for visibility
  if (!configs?.[provider] && !connection) {
    const legacy = await resolveLegacyConnection(supabase, job.client_id, provider);
    if (!legacy) throw new Error(`No ${provider} connection found for client`);
    // Project legacy back into config shape for executors
    configs = {
      [provider]: provider === "clio"
        ? { oauthTokenId: legacy.legacy_oauth_token_id }
        : { apiKeyId: legacy.legacy_api_key_id },
    };
    console.warn(`[legal-connect-jobs] Using legacy bridge for ${provider} (client=${job.client_id}). Migrate to legal_connect_connections.`);
  }

  if (provider === "clio") {
    return await executeClioJob(supabase, job, configs);
  }
  if (provider === "mycase") {
    return await executeMyCaseJob(supabase, job, configs);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// ─── Main Server ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case "processQueue": {
        const batchSize = payload.batch_size ?? 10;
        const { data: jobs, error: fetchErr } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .select("*")
          .eq("status", "queued")
          .lte("next_attempt_at", new Date().toISOString())
          .order("priority", { ascending: true })
          .order("next_attempt_at", { ascending: true })
          .limit(batchSize);

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
          return new Response(JSON.stringify({ processed: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let processed = 0, failed = 0, deadLettered = 0;

        for (const job of jobs) {
          const { data: config } = await supabaseAdmin
            .from("legal_connect_tenant_configs")
            .select("outage_mode")
            .eq("organization_id", job.organization_id)
            .eq("client_id", job.client_id)
            .maybeSingle();

          if (config?.outage_mode) {
            await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .update({ status: "paused", next_attempt_at: null })
              .eq("id", job.id);
            continue;
          }

          await supabaseAdmin
            .from("legal_connect_sync_jobs")
            .update({
              status: "processing",
              last_attempt_at: new Date().toISOString(),
              attempt_count: job.attempt_count + 1,
            })
            .eq("id", job.id);

          try {
            // ── Real CRM dispatch ──
            const result = await executeJob(supabaseAdmin, job);

            await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .update({
                status: "succeeded",
                succeeded_at: new Date().toISOString(),
                output_payload: result.output,
              })
              .eq("id", job.id);

            if (job.source_event_log_id) {
              await supabaseAdmin
                .from("legal_connect_event_log")
                .update({ processing_status: "processed", processed_at: new Date().toISOString() })
                .eq("id", job.source_event_log_id);
            }

            processed++;
          } catch (procErr) {
            const errMsg = procErr instanceof Error ? procErr.message : "Unknown error";
            const classification = classifyFailure(errMsg);
            const isRetryable = !NON_RETRYABLE.has(classification);
            const newAttempt = job.attempt_count + 1;

            await supabaseAdmin.from("legal_connect_failure_classifications").insert({
              organization_id: job.organization_id,
              client_id: job.client_id,
              sync_job_id: job.id,
              source_event_log_id: job.source_event_log_id,
              classification,
              is_retryable: isRetryable,
              notes: errMsg,
            });

            if (!isRetryable || newAttempt >= job.max_attempts) {
              await supabaseAdmin
                .from("legal_connect_sync_jobs")
                .update({
                  status: "dead_letter",
                  failed_at: new Date().toISOString(),
                  failure_reason: errMsg,
                  failure_classification: classification,
                })
                .eq("id", job.id);

              await supabaseAdmin.from("legal_connect_review_queue").insert({
                organization_id: job.organization_id,
                client_id: job.client_id,
                review_type: "dead_letter",
                title: `Dead-lettered sync job: ${job.job_type}`,
                description: `Job failed after ${newAttempt} attempts. Classification: ${classification}. Error: ${errMsg}`,
                provider: job.provider,
                entity_type: job.job_type.split(".")[0] ?? "unknown",
                correlation_id: job.correlation_id,
                context: { job_id: job.id, classification, attempts: newAttempt },
                status: "pending",
              });

              deadLettered++;
            } else {
              const backoff = getBackoffMs(newAttempt);
              await supabaseAdmin
                .from("legal_connect_sync_jobs")
                .update({
                  status: "queued",
                  failure_reason: errMsg,
                  failure_classification: classification,
                  next_attempt_at: new Date(Date.now() + backoff).toISOString(),
                })
                .eq("id", job.id);

              failed++;
            }
          }
        }

        return new Response(JSON.stringify({ processed, failed, deadLettered, total: jobs.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "replayJob": {
        const { job_id, event_log_id } = payload;
        let sourceJob: Record<string, unknown> | null = null;
        let sourceEvent: Record<string, unknown> | null = null;

        if (job_id) {
          const { data } = await supabaseAdmin
            .from("legal_connect_sync_jobs")
            .select("*")
            .eq("id", job_id)
            .single();
          sourceJob = data;
        }
        if (event_log_id) {
          const { data } = await supabaseAdmin
            .from("legal_connect_event_log")
            .select("*")
            .eq("id", event_log_id)
            .single();
          sourceEvent = data;
        }

        if (!sourceJob && !sourceEvent) {
          return new Response(JSON.stringify({ error: "Source job or event not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const source = sourceJob ?? sourceEvent!;
        const newCorrelationId = crypto.randomUUID();

        const { data: replayJob, error: replayErr } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .insert({
            organization_id: source.organization_id,
            client_id: source.client_id,
            provider: source.provider,
            job_type: sourceJob ? (source as any).job_type : `${(source as any).source_event_type}`,
            direction: (source as any).direction ?? "inbound",
            priority: 50,
            idempotency_key: `replay:${newCorrelationId}`,
            correlation_id: newCorrelationId,
            source_event_log_id: sourceJob ? (source as any).source_event_log_id : (source as any).id,
            status: "queued",
            input_payload: sourceJob ? (source as any).input_payload : { raw: (source as any).payload, normalized: (source as any).normalized_payload },
            is_replay: true,
            replay_source_id: job_id ?? null,
            next_attempt_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (replayErr) throw replayErr;

        return new Response(JSON.stringify({ replay_job_id: replayJob.id, correlation_id: newCorrelationId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "renewExpiring": {
        const renewWindow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

        const { data: expiring } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("status", "active")
          .lt("expires_at", renewWindow)
          .order("expires_at", { ascending: true });

        if (!expiring || expiring.length === 0) {
          return new Response(JSON.stringify({ renewed: 0, recreated: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let renewed = 0, failedRenewals = 0, recreated = 0;

        for (const sub of expiring) {
          try {
            const newExpiry = new Date(Date.now() + CLIO_MAX_WEBHOOK_DAYS * 24 * 60 * 60 * 1000).toISOString();
            const newRenewAfter = new Date(Date.now() + CLIO_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

            await supabaseAdmin
              .from("legal_connect_webhook_subscriptions")
              .update({
                expires_at: newExpiry,
                renew_after: newRenewAfter,
                failure_count: 0,
                health_status: "healthy",
              })
              .eq("id", sub.id);

            await supabaseAdmin.from("legal_connect_webhook_renewal_log").insert({
              subscription_id: sub.id,
              organization_id: sub.organization_id,
              client_id: sub.client_id,
              action: "auto_renew",
              previous_expires_at: sub.expires_at,
              new_expires_at: newExpiry,
              success: true,
            });

            renewed++;
          } catch (renewErr) {
            const errMsg = renewErr instanceof Error ? renewErr.message : "Renewal failed";
            const newFailureCount = (sub.failure_count ?? 0) + 1;

            await supabaseAdmin.from("legal_connect_webhook_renewal_log").insert({
              subscription_id: sub.id,
              organization_id: sub.organization_id,
              client_id: sub.client_id,
              action: "auto_renew",
              previous_expires_at: sub.expires_at,
              new_expires_at: null,
              success: false,
              error_message: errMsg,
            });

            if (newFailureCount >= MAX_RENEWAL_FAILURES_BEFORE_RECREATE) {
              const { data: conn } = await supabaseAdmin
                .from("legal_connect_connections")
                .select("id, status")
                .eq("id", sub.connection_id)
                .maybeSingle();

              if (conn && conn.status === "connected") {
                try {
                  const newExpiry = new Date(Date.now() + CLIO_MAX_WEBHOOK_DAYS * 24 * 60 * 60 * 1000).toISOString();
                  const newRenewAfter = new Date(Date.now() + CLIO_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

                  await supabaseAdmin
                    .from("legal_connect_webhook_subscriptions")
                    .update({
                      remote_webhook_id: `recreated_${crypto.randomUUID().slice(0, 8)}`,
                      expires_at: newExpiry,
                      renew_after: newRenewAfter,
                      status: "active",
                      health_status: "healthy",
                      failure_count: 0,
                    })
                    .eq("id", sub.id);

                  await supabaseAdmin.from("legal_connect_webhook_renewal_log").insert({
                    subscription_id: sub.id,
                    organization_id: sub.organization_id,
                    client_id: sub.client_id,
                    action: "auto_recreate",
                    previous_expires_at: sub.expires_at,
                    new_expires_at: newExpiry,
                    success: true,
                  });

                  recreated++;
                  continue;
                } catch {
                  // Fall through to degraded status
                }
              }
            }

            const healthStatus = computeHealthStatus({ ...sub, failure_count: newFailureCount });
            await supabaseAdmin
              .from("legal_connect_webhook_subscriptions")
              .update({
                failure_count: newFailureCount,
                health_status: healthStatus,
                status: healthStatus === "critical" || healthStatus === "expired" ? "unhealthy" : "active",
              })
              .eq("id", sub.id);

            await supabaseAdmin.from("legal_connect_failure_classifications").insert({
              organization_id: sub.organization_id,
              client_id: sub.client_id,
              classification: "renewal_failed",
              is_retryable: true,
              notes: `Webhook renewal failed for ${sub.provider}: ${errMsg}`,
            });

            failedRenewals++;
          }
        }

        return new Response(JSON.stringify({ renewed, failedRenewals, recreated, checked: expiring.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "computeAllHealth": {
        const { data: allSubs } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*");

        if (!allSubs) {
          return new Response(JSON.stringify({ updated: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let updated = 0;
        for (const sub of allSubs) {
          const health = computeHealthStatus(sub);
          if (health !== sub.health_status) {
            await supabaseAdmin
              .from("legal_connect_webhook_subscriptions")
              .update({ health_status: health })
              .eq("id", sub.id);
            updated++;
          }
        }

        return new Response(JSON.stringify({ updated, total: allSubs.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Job processor error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
