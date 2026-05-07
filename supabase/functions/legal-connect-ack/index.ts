// Phase 10/11 — External acknowledgment endpoint for Legal Connect issues.
//
// Phase 11 hardening:
//  - All invalid attempts (bad token, expired, mismatched action, signature
//    failure, replayed timestamps) are logged to legal_connect_webhook_failures
//    with reason + IP + UA so ops can audit abuse.
//  - Signed POST callbacks now require an `x-lc-timestamp` header (unix
//    seconds) within ±5 minutes of server time. The HMAC message includes
//    the timestamp to make replays useless after the window.
//  - The audit_logs table is appended on every successful external ack with
//    the source (slack|webhook), tenant, organization, actor, and the state
//    transition (old -> new).
//
// GET  /?token=<one-time-token>&action=acknowledged|monitoring|resolved
//   Single-use token from Slack action button.
//
// POST /
//   Body: { token, action, note?, actor? }                       (token path)
//   Body: { organization_id, issue_key, action, note?, actor?, timestamp? }
//   Headers: x-lc-signature, x-lc-timestamp                      (signed path)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lc-signature, x-lc-timestamp",
};

type Action = "acknowledged" | "monitoring" | "resolved";
const VALID_ACTIONS: Action[] = ["acknowledged", "monitoring", "resolved"];
const REPLAY_WINDOW_SECONDS = 5 * 60;

function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    null
  );
}

async function logFailure(
  admin: any, orgId: string | null, endpoint: string, reason: string, req: Request,
  payload: string | null, sigPresent: boolean,
) {
  try {
    await admin.from("legal_connect_webhook_failures").insert({
      organization_id: orgId,
      endpoint,
      reason,
      ip_address: clientIp(req),
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      payload_excerpt: payload ? payload.slice(0, 500) : null,
      signature_present: sigPresent,
    });
  } catch (_e) { /* best-effort */ }
}

async function logAudit(
  admin: any, orgId: string | null, tenantId: string | null, action: string,
  entityId: string | null, source: string, actor: string | null, details: any,
) {
  try {
    await admin.from("audit_logs").insert({
      action,
      entity_type: "legal_connect_issue_review",
      entity_id: entityId,
      organization_id: orgId,
      tenant_id: tenantId,
      source,
      details: { actor, ...details },
    });
  } catch (_e) { /* best-effort */ }
}

function htmlPage(title: string, body: string, ok = true): Response {
  const color = ok ? "#0EA5E9" : "#dc2626";
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <div style="max-width:480px;margin:64px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="padding:16px 20px;background:${color};color:#fff;font-weight:600">${title}</div>
    <div style="padding:20px;font-size:14px;line-height:1.55">${body}</div>
  </div>
</body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function applyReview(
  admin: any, orgId: string, tenantId: string | null, issueKey: string, action: Action,
  source: "slack" | "webhook" | "system", actor: string | null, note: string | null,
  eventId: string | null,
) {
  const nowIso = new Date().toISOString();

  // Capture prior state for audit
  const { data: prior } = await admin.from("legal_connect_issue_reviews")
    .select("status, updated_from").eq("organization_id", orgId)
    .eq("issue_key", issueKey).maybeSingle();

  await admin.from("legal_connect_issue_reviews").upsert(
    {
      organization_id: orgId,
      issue_key: issueKey,
      status: action,
      note,
      updated_from: source,
      external_actor: actor,
      updated_at: nowIso,
    },
    { onConflict: "organization_id,issue_key" },
  );

  if (eventId) {
    const ackStatus = action === "resolved" ? "resolved" : "acknowledged";
    await admin.from("legal_connect_escalation_events")
      .update({
        ack_status: ackStatus,
        acked_at: nowIso,
        acked_by: actor,
        linked_issue_key: issueKey,
      })
      .eq("id", eventId);
  }

  await logAudit(admin, orgId, tenantId, "lc.issue_review.external_ack", issueKey,
    source, actor, {
      issue_key: issueKey, event_id: eventId,
      from_status: prior?.status ?? null, to_status: action,
      from_source: prior?.updated_from ?? null,
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const endpoint = "legal-connect-ack";

  // -------- Slack-style GET with one-time token --------
  if (req.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    const action = (url.searchParams.get("action") ?? "acknowledged") as Action;
    const actor = url.searchParams.get("actor");
    if (!token || !VALID_ACTIONS.includes(action)) {
      await logFailure(admin, null, endpoint, "missing_or_invalid_params", req, null, false);
      return htmlPage("Invalid acknowledgment link", "Missing or unknown parameters.", false);
    }
    const { data: row } = await admin.from("legal_connect_ack_tokens")
      .select("*").eq("token", token).maybeSingle();
    if (!row) {
      await logFailure(admin, null, endpoint, "unknown_token", req, null, false);
      return htmlPage("Link not recognized", "This acknowledgment link is invalid.", false);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await logFailure(admin, row.organization_id, endpoint, "token_expired", req, null, false);
      return htmlPage("Link expired", "This acknowledgment link is no longer valid.", false);
    }
    if (row.action !== action) {
      await logFailure(admin, row.organization_id, endpoint, "action_mismatch", req, null, false);
      return htmlPage("Action mismatch", "This link was issued for a different action.", false);
    }
    if (row.used_at) {
      await logFailure(admin, row.organization_id, endpoint, "token_replay", req, null, false);
      return htmlPage(
        `Already ${row.action}`,
        `This issue was already marked <b>${row.action}</b> via ${row.source}.`,
      );
    }
    await applyReview(admin, row.organization_id, row.tenant_id, row.issue_key, action, row.source as any, actor, null, row.event_id);
    await admin.from("legal_connect_ack_tokens").update({ used_at: new Date().toISOString(), used_by: actor }).eq("id", row.id);
    return htmlPage(
      `Issue ${action}`,
      `<p>Thanks — issue <code>${row.issue_key}</code> was marked <b>${action}</b>.</p>
       <p style="color:#6b7280;font-size:12px">You can close this tab.</p>`,
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  let body: any;
  try { body = JSON.parse(rawBody); } catch {
    await logFailure(admin, null, endpoint, "invalid_json", req, rawBody, false);
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
  }

  const action = body.action as Action;
  if (!VALID_ACTIONS.includes(action)) {
    await logFailure(admin, body.organization_id ?? null, endpoint, "invalid_action", req, rawBody, false);
    return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers: corsHeaders });
  }

  const note: string | null = typeof body.note === "string" ? body.note.slice(0, 1000) : null;
  const actor: string | null = typeof body.actor === "string" ? body.actor.slice(0, 200) : null;

  // ---- Token-based path (Slack/webhook close-the-loop with one-time tok) ----
  if (body.token) {
    const { data: row } = await admin.from("legal_connect_ack_tokens")
      .select("*").eq("token", body.token).maybeSingle();
    if (!row) {
      await logFailure(admin, null, endpoint, "unknown_token", req, rawBody, false);
      return new Response(JSON.stringify({ error: "unknown_token" }), { status: 404, headers: corsHeaders });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await logFailure(admin, row.organization_id, endpoint, "token_expired", req, rawBody, false);
      return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: corsHeaders });
    }
    if (row.action !== action) {
      await logFailure(admin, row.organization_id, endpoint, "action_mismatch", req, rawBody, false);
      return new Response(JSON.stringify({ error: "action_mismatch" }), { status: 409, headers: corsHeaders });
    }
    if (row.used_at) {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200, headers: corsHeaders });
    }
    await applyReview(admin, row.organization_id, row.tenant_id, row.issue_key, action, row.source as any, actor, note, row.event_id);
    await admin.from("legal_connect_ack_tokens").update({
      used_at: new Date().toISOString(), used_by: actor,
    }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  // ---- Signed webhook path ----
  const orgId: string | undefined = body.organization_id;
  const issueKey: string | undefined = body.issue_key;
  const sigHeader = req.headers.get("x-lc-signature") ?? body.signature ?? "";
  const tsHeader = req.headers.get("x-lc-timestamp") ?? (body.timestamp ? String(body.timestamp) : "");
  const sigPresent = !!sigHeader;

  if (!orgId || !issueKey || !sigHeader) {
    await logFailure(admin, orgId ?? null, endpoint, "missing_fields", req, rawBody, sigPresent);
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: corsHeaders });
  }

  // Replay protection: require a recent timestamp.
  const tsNum = Number(tsHeader);
  if (!Number.isFinite(tsNum) || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > REPLAY_WINDOW_SECONDS) {
    await logFailure(admin, orgId, endpoint, "stale_or_missing_timestamp", req, rawBody, sigPresent);
    return new Response(JSON.stringify({ error: "stale_timestamp" }), { status: 401, headers: corsHeaders });
  }

  const { data: sinks } = await admin.from("legal_connect_escalation_sinks")
    .select("id, hmac_secret, tenant_id").eq("organization_id", orgId).eq("kind", "webhook")
    .not("hmac_secret", "is", null);

  const message = `${tsNum}|${orgId}|${issueKey}|${action}`;
  const wantedSig = sigHeader.replace(/^sha256=/, "");
  let matchedSinkId: string | null = null;
  let matchedTenantId: string | null = null;
  for (const s of sinks ?? []) {
    if (!s.hmac_secret) continue;
    const got = await hmacHex(s.hmac_secret, message);
    if (timingSafeEq(got, wantedSig)) {
      matchedSinkId = s.id;
      matchedTenantId = s.tenant_id ?? null;
      break;
    }
  }
  if (!matchedSinkId) {
    await logFailure(admin, orgId, endpoint, "invalid_signature", req, rawBody, sigPresent);
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401, headers: corsHeaders });
  }

  // Idempotency
  const { data: existingReview } = await admin.from("legal_connect_issue_reviews")
    .select("status, updated_from").eq("organization_id", orgId).eq("issue_key", issueKey).maybeSingle();
  if (existingReview?.status === action && existingReview.updated_from === "webhook") {
    return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200, headers: corsHeaders });
  }

  await applyReview(admin, orgId, matchedTenantId, issueKey, action, "webhook", actor ?? "external-webhook", note, null);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
