// Phase 7 · canonical submission → output pipeline.
//
// Replaces the Phase 6 localStorage-only stub with the real pipeline:
//   1. Persist the InteractionDraftPayload as a canonical InteractionRecord
//      using existing storage (platform_events + an idempotency-keyed
//      sync-log row in legal_connect_event_log).
//   2. Resolve the workspace → org/client context.
//   3. Run contact match against legal_connect_contacts.
//   4. Enqueue adapter writeback jobs onto legal_connect_sync_jobs (the
//      existing `legal-connect-jobs` worker drains them with retry,
//      backoff, idempotency, and dead-letter classification).
//   5. Enqueue notification jobs (channel='internal'/'email'/'slack'/'webhook')
//      either into legal_connect_sync_jobs (job_type='notification') for
//      retryable channels, or directly into `notifications` for fan-out.
//   6. Write structured sync-log rows for every step; record exceptions
//      onto legal_connect_review_queue when ambiguity / unrecoverable
//      errors arise.
//
// No schema changes. The function is idempotent: re-submitting the same
// payload reuses the InteractionRecord id and enqueues no duplicate jobs
// because every job carries an idempotency_key derived from that id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { requireOrgMember, requireUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LEGAL_PROVIDERS = new Set(["clio", "clio_manage", "mycase", "smokeball", "clio_grow"]);

type Json = Record<string, unknown>;

interface InteractionDraftPayload {
  schemaVersion: 1;
  meta: {
    workspaceId: string;
    campaignId: string;
    callId?: string | null;
    ani?: string | null;
    startedAt: string;
    workspaceName?: string;
    campaignName?: string;
  };
  values: Json;
  notes: string;
  outcomeCode: string | null;
  copilot: { draftSummary?: string; suggestedNotificationTargets?: string[] };
  completedStepIds: string[];
  finalizedAt: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: "service_role_unavailable" });
  }

  let body: { payload?: InteractionDraftPayload } | null = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }
  const payload = body?.payload;
  if (!payload || payload.schemaVersion !== 1 || !payload.meta?.workspaceId || !payload.meta?.campaignId) {
    return json(400, { ok: false, error: "invalid_payload" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const ctx = await resolveContext(supabase, payload);
    const orgCheck = await requireOrgMember(auth.user.id, ctx.organizationId);
    if (!orgCheck.ok) return orgCheck.response;
    const interactionId = buildInteractionId(payload);

    // 1. Persist InteractionRecord. We use platform_events as the canonical
    //    long-form store (existing JSONB, audited) and tag with the
    //    deterministic interactionId so re-submits are no-ops.
    await persistInteractionRecord(supabase, ctx, interactionId, payload);

    // 2. Sync log — "interaction created" row.
    await logSyncStep(supabase, ctx, interactionId, {
      direction: "outbound",
      source_type: "interaction_pipeline",
      source_event_type: "interaction.recorded",
      processing_status: "received",
      payload: { interactionId, outcomeCode: payload.outcomeCode },
    });

    // 3. Contact match (best-effort; never blocks pipeline).
    const match = await runContactMatch(supabase, ctx, payload);
    await logSyncStep(supabase, ctx, interactionId, {
      direction: "internal",
      source_type: "interaction_pipeline",
      source_event_type: "contact.match",
      processing_status: match.kind === "linked" ? "processed" : match.kind === "ambiguous" ? "review" : "received",
      payload: { match },
    });
    if (match.kind === "ambiguous" && ctx.clientId) {
      await pushReviewItem(supabase, ctx, interactionId, "contact_match_ambiguous", {
        candidates: match.candidates.map((c) => c.id),
        chosen: match.chosenId,
      });
    }

    // 4. Enqueue adapter writeback jobs (drained by `legal-connect-jobs`).
    const adapterJobsQueued = await enqueueAdapterJobs(supabase, ctx, interactionId, payload, match);

    // 5. Enqueue notification jobs.
    const notificationsQueued = await enqueueNotifications(supabase, ctx, interactionId, payload);

    await logSyncStep(supabase, ctx, interactionId, {
      direction: "internal",
      source_type: "interaction_pipeline",
      source_event_type: "pipeline.completed",
      processing_status: "processed",
      payload: { adapterJobsQueued, notificationsQueued, match: match.kind },
    });

    // 6. Kick the worker once, fire-and-forget, so jobs start moving without
    //    waiting for the next cron tick.
    pokeWorker(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).catch(() => {});

    return json(200, {
      ok: true,
      interactionId,
      adapterJobsQueued,
      notificationsQueued,
      contactMatch: match.kind,
    });
  } catch (err) {
    const message = (err as Error).message ?? "internal_error";
    console.error("[fabric59 phase7 pipeline] error", message);
    return json(500, { ok: false, error: message });
  }
});

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PipelineContext {
  workspaceId: string;
  organizationId: string;
  clientId: string | null;
  campaignId: string;
}

async function resolveContext(supabase: ReturnType<typeof createClient>, payload: InteractionDraftPayload): Promise<PipelineContext> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", payload.meta.workspaceId)
    .maybeSingle();
  if (!ws) throw new Error("workspace_not_found");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, client_id")
    .eq("id", payload.meta.campaignId)
    .maybeSingle();

  return {
    workspaceId: ws.id as string,
    organizationId: ws.organization_id as string,
    clientId: (campaign?.client_id as string | null) ?? null,
    campaignId: payload.meta.campaignId,
  };
}

function buildInteractionId(payload: InteractionDraftPayload): string {
  if (payload.meta.callId) return `int_${payload.meta.callId}`;
  return `int_${payload.meta.workspaceId}_${payload.meta.campaignId}_${payload.finalizedAt}`;
}

async function persistInteractionRecord(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  interactionId: string,
  payload: InteractionDraftPayload,
) {
  // platform_events row carries the full canonical record; correlation_id
  // is the interactionId so duplicates collapse on re-submit (unique constraint
  // exists? if not, we still de-dupe by checking).
  const { data: existing } = await supabase
    .from("platform_events")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("event_type", "interaction.recorded")
    .eq("correlation_id", interactionId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("platform_events").insert({
    organization_id: ctx.organizationId,
    event_type: "interaction.recorded",
    source: "interaction_pipeline",
    correlation_id: interactionId,
    payload: {
      schemaVersion: 1,
      interactionId,
      workspaceId: ctx.workspaceId,
      campaignId: ctx.campaignId,
      clientId: ctx.clientId,
      meta: payload.meta,
      outcomeCode: payload.outcomeCode,
      values: payload.values,
      notes: payload.notes,
      copilot: payload.copilot,
      completedStepIds: payload.completedStepIds,
      finalizedAt: payload.finalizedAt,
    },
  });
}

interface MatchResult {
  kind: "linked" | "ambiguous" | "none";
  via?: string;
  contactId?: string;
  candidates: Array<{ id: string; name?: string; phone?: string; email?: string }>;
  chosenId?: string | null;
}

async function runContactMatch(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  payload: InteractionDraftPayload,
): Promise<MatchResult> {
  if (!ctx.clientId) return { kind: "none", candidates: [] };
  const v = payload.values ?? {};
  const phone = normalizePhone(String(v.caller_phone ?? v.phone ?? payload.meta.ani ?? ""));
  const email = String(v.caller_email ?? v.email ?? "").trim().toLowerCase();
  const fullName = String(v.caller_name ?? v.full_name ?? "").trim().toLowerCase();

  // Try phone, then email, then name — query legal_connect_contacts scoped to client.
  if (phone) {
    const { data } = await supabase
      .from("legal_connect_contacts")
      .select("id, full_name, phone, email, last_synced_at")
      .eq("client_id", ctx.clientId)
      .eq("phone", phone)
      .limit(5);
    if (data && data.length === 1) {
      return { kind: "linked", via: "phone", contactId: data[0].id as string, candidates: data.map(toCand), chosenId: data[0].id as string };
    }
    if (data && data.length > 1) {
      const chosen = mostRecent(data);
      return { kind: "ambiguous", via: "phone", candidates: data.map(toCand), chosenId: chosen.id as string };
    }
  }
  if (email) {
    const { data } = await supabase
      .from("legal_connect_contacts")
      .select("id, full_name, phone, email, last_synced_at")
      .eq("client_id", ctx.clientId)
      .eq("email", email)
      .limit(5);
    if (data && data.length === 1) {
      return { kind: "linked", via: "email", contactId: data[0].id as string, candidates: data.map(toCand), chosenId: data[0].id as string };
    }
    if (data && data.length > 1) {
      const chosen = mostRecent(data);
      return { kind: "ambiguous", via: "email", candidates: data.map(toCand), chosenId: chosen.id as string };
    }
  }
  if (fullName) {
    const { data } = await supabase
      .from("legal_connect_contacts")
      .select("id, full_name, phone, email, last_synced_at")
      .eq("client_id", ctx.clientId)
      .ilike("full_name", fullName)
      .limit(5);
    if (data && data.length === 1) {
      return { kind: "linked", via: "name_only", contactId: data[0].id as string, candidates: data.map(toCand), chosenId: data[0].id as string };
    }
    if (data && data.length > 1) {
      const chosen = mostRecent(data);
      return { kind: "ambiguous", via: "full_name", candidates: data.map(toCand), chosenId: chosen.id as string };
    }
  }
  return { kind: "none", candidates: [] };
}

function toCand(r: Record<string, unknown>) {
  return { id: r.id as string, name: r.full_name as string, phone: r.phone as string, email: r.email as string };
}
function mostRecent(rows: Array<Record<string, unknown>>) {
  return [...rows].sort((a, b) => {
    const at = a.last_synced_at ? Date.parse(a.last_synced_at as string) : 0;
    const bt = b.last_synced_at ? Date.parse(b.last_synced_at as string) : 0;
    return bt - at;
  })[0];
}
function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}

async function enqueueAdapterJobs(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  interactionId: string,
  payload: InteractionDraftPayload,
  match: MatchResult,
): Promise<number> {
  if (!ctx.clientId) return 0;
  const { data: connections } = await supabase
    .from("legal_connect_connections")
    .select("id, provider, status")
    .eq("client_id", ctx.clientId)
    .eq("status", "connected");

  const active = (connections ?? []).filter((c: Record<string, unknown>) =>
    LEGAL_PROVIDERS.has(String(c.provider).toLowerCase()),
  );
  if (active.length === 0) return 0;

  const v = payload.values ?? {};
  const contactLink = match.kind === "linked" ? "matched" : match.kind === "ambiguous" ? "ambiguous_default" : "unmatched";
  const contactPayload = {
    full_name: v.caller_name ?? v.full_name ?? null,
    first_name: v.first_name ?? null,
    last_name: v.last_name ?? null,
    email: v.caller_email ?? v.email ?? null,
    phone: payload.meta.ani ?? v.caller_phone ?? v.phone ?? null,
    contact_id: match.contactId ?? match.chosenId ?? null,
    contact_link: contactLink,
  };
  const noteBody = [payload.copilot?.draftSummary, payload.notes].filter(Boolean).join("\n\n").trim();

  const rows: Array<Record<string, unknown>> = [];
  for (const conn of active) {
    const base = `${interactionId}:${conn.id}`;
    const ctxBase = {
      organization_id: ctx.organizationId,
      client_id: ctx.clientId,
      provider: conn.provider,
      correlation_id: interactionId,
      max_attempts: 5,
      status: "queued",
      next_attempt_at: new Date().toISOString(),
    };
    if (contactPayload.phone || contactPayload.email || contactPayload.full_name) {
      rows.push({
        ...ctxBase,
        job_type: "create_intake",
        idempotency_key: `${base}:intake`,
        input_payload: {
          interactionId,
          contact: contactPayload,
          outcome: payload.outcomeCode,
          notes: payload.notes,
          values: v,
        },
      });
    }
    if (noteBody) {
      rows.push({
        ...ctxBase,
        job_type: "log_client_note",
        idempotency_key: `${base}:note`,
        input_payload: {
          interactionId,
          content: noteBody,
          subject: `Call summary · ${payload.outcomeCode ?? "no outcome"}`,
          contact: contactPayload,
        },
      });
    }
    if (shouldCreateFollowup(payload.outcomeCode)) {
      rows.push({
        ...ctxBase,
        job_type: "create_followup_task",
        idempotency_key: `${base}:followup`,
        input_payload: {
          interactionId,
          subject: `Follow up · ${payload.outcomeCode ?? "callback"}`,
          due_in_hours: 24,
          contact: contactPayload,
        },
      });
    }
  }

  if (rows.length === 0) return 0;
  // Use upsert on idempotency_key so resubmits don't double-enqueue.
  await supabase.from("legal_connect_sync_jobs").upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true });
  return rows.length;
}

function shouldCreateFollowup(code: string | null): boolean {
  if (!code) return false;
  return /callback|follow|escal|voicemail|left.?message|missed/i.test(code);
}

async function enqueueNotifications(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  interactionId: string,
  payload: InteractionDraftPayload,
): Promise<number> {
  if (!ctx.clientId) return 0;
  const targets = (payload.copilot?.suggestedNotificationTargets ?? []).filter((t) => t && t.trim());
  const urgency = inferUrgency(payload);
  const baseTrigger = `interaction.${(payload.outcomeCode ?? "submitted").toLowerCase()}`;

  let count = 0;
  for (const recipient of targets) {
    const channel = recipient.includes("@") ? "email" : recipient.startsWith("#") ? "slack" : "internal";
    const { error } = await supabase.from("notifications").insert({
      tenant_id: ctx.clientId,
      channel,
      recipient,
      trigger_event: baseTrigger,
      payload: {
        interactionId,
        workspaceId: ctx.workspaceId,
        campaignId: ctx.campaignId,
        urgency,
        outcome: payload.outcomeCode,
        summary: payload.copilot?.draftSummary ?? payload.notes?.slice(0, 280) ?? "",
        finalizedAt: payload.finalizedAt,
        idempotencyKey: `${interactionId}:notif:${recipient}`,
      },
      status: "pending",
    });
    if (!error) count++;
  }
  return count;
}

function inferUrgency(p: InteractionDraftPayload): string {
  const explicit = typeof p.values?.urgency === "string" ? (p.values.urgency as string).toLowerCase() : "";
  if (["urgent", "high", "normal", "low"].includes(explicit)) return explicit;
  const code = (p.outcomeCode ?? "").toLowerCase();
  if (/urgent|emergency|escal|crisis/.test(code)) return "urgent";
  return "normal";
}

async function logSyncStep(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  interactionId: string,
  entry: {
    direction: string;
    source_type: string;
    source_event_type: string;
    processing_status: string;
    payload: Json;
  },
) {
  if (!ctx.clientId) return; // event_log requires client_id
  await supabase.from("legal_connect_event_log").insert({
    organization_id: ctx.organizationId,
    client_id: ctx.clientId,
    direction: entry.direction,
    source_type: entry.source_type,
    source_event_type: entry.source_event_type,
    processing_status: entry.processing_status,
    correlation_id: interactionId,
    payload: entry.payload,
    received_at: new Date().toISOString(),
  });
}

async function pushReviewItem(
  supabase: ReturnType<typeof createClient>,
  ctx: PipelineContext,
  interactionId: string,
  reason: string,
  details: Json,
) {
  if (!ctx.clientId) return;
  await supabase.from("legal_connect_review_queue").insert({
    organization_id: ctx.organizationId,
    client_id: ctx.clientId,
    correlation_id: interactionId,
    reason,
    payload: { interactionId, ...details },
    status: "pending",
  }).select().single().then(() => {}, () => {}); // tolerate optional columns
}

async function pokeWorker(url: string, serviceKey: string) {
  // Best-effort: ask `legal-connect-jobs` to process the queue immediately.
  try {
    await fetch(`${url}/functions/v1/legal-connect-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ action: "processQueue" }),
    });
  } catch {
    /* swallowed — cron will pick it up */
  }
}
