// Phase 10 — External acknowledgment endpoint for Legal Connect issues.
//
// Two ways to call:
//
//  GET  /?token=<one-time-token>&action=acknowledged|monitoring|resolved
//    Used by Slack action links. The token is an opaque random value created
//    when the digest/escalation was sent. It is single-use, scoped to a
//    specific (organization_id, issue_key, action), and time-limited.
//    Returns a small HTML page so the operator gets a friendly confirmation.
//
//  POST /webhook
//    Body: { token, action, note?, actor? }
//    Or:    { organization_id, issue_key, action, signature, note?, actor? }
//      where signature = HMAC-SHA256(sink.hmac_secret, organization_id|issue_key|action)
//
// All paths update legal_connect_issue_reviews + the originating
// legal_connect_escalation_event (when one is linked) and are idempotent:
// re-applying the same action on a token that has already been used returns
// the same success response without changing data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lc-signature",
};

type Action = "acknowledged" | "monitoring" | "resolved";
const VALID_ACTIONS: Action[] = ["acknowledged", "monitoring", "resolved"];

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
  admin: any, orgId: string, issueKey: string, action: Action,
  source: "slack" | "webhook" | "system", actor: string | null, note: string | null,
  eventId: string | null,
) {
  const nowIso = new Date().toISOString();
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);

  // -------- Slack-style GET with one-time token --------
  if (req.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    const action = (url.searchParams.get("action") ?? "acknowledged") as Action;
    const actor = url.searchParams.get("actor");
    if (!token || !VALID_ACTIONS.includes(action)) {
      return htmlPage("Invalid acknowledgment link", "Missing or unknown parameters.", false);
    }
    const { data: row } = await admin.from("legal_connect_ack_tokens")
      .select("*").eq("token", token).maybeSingle();
    if (!row) return htmlPage("Link not recognized", "This acknowledgment link is invalid.", false);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return htmlPage("Link expired", "This acknowledgment link is no longer valid.", false);
    }
    if (row.action !== action) {
      return htmlPage("Action mismatch", "This link was issued for a different action.", false);
    }
    if (row.used_at) {
      return htmlPage(
        `Already ${row.action}`,
        `This issue was already marked <b>${row.action}</b> via ${row.source}.`,
      );
    }
    await applyReview(admin, row.organization_id, row.issue_key, action, row.source as any, actor, null, row.event_id);
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

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
  }

  const action = body.action as Action;
  if (!VALID_ACTIONS.includes(action)) {
    return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers: corsHeaders });
  }

  const note: string | null = typeof body.note === "string" ? body.note.slice(0, 1000) : null;
  const actor: string | null = typeof body.actor === "string" ? body.actor.slice(0, 200) : null;

  // Token-based path (safe default for Slack/webhook close-the-loop)
  if (body.token) {
    const { data: row } = await admin.from("legal_connect_ack_tokens")
      .select("*").eq("token", body.token).maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: "unknown_token" }), { status: 404, headers: corsHeaders });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: corsHeaders });
    }
    if (row.action !== action) {
      return new Response(JSON.stringify({ error: "action_mismatch" }), { status: 409, headers: corsHeaders });
    }
    if (row.used_at) {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200, headers: corsHeaders });
    }
    await applyReview(admin, row.organization_id, row.issue_key, action, row.source as any, actor, note, row.event_id);
    await admin.from("legal_connect_ack_tokens").update({
      used_at: new Date().toISOString(), used_by: actor,
    }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  // Signed webhook path (downstream system close-the-loop)
  const orgId: string | undefined = body.organization_id;
  const issueKey: string | undefined = body.issue_key;
  const sigHeader = req.headers.get("x-lc-signature") ?? body.signature ?? "";
  if (!orgId || !issueKey || !sigHeader) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: corsHeaders });
  }

  // Find any sink for this org with an HMAC secret that validates this payload
  const { data: sinks } = await admin.from("legal_connect_escalation_sinks")
    .select("id, hmac_secret, tenant_id").eq("organization_id", orgId).eq("kind", "webhook")
    .not("hmac_secret", "is", null);

  const message = `${orgId}|${issueKey}|${action}`;
  const wantedSig = sigHeader.replace(/^sha256=/, "");
  let matchedSinkId: string | null = null;
  for (const s of sinks ?? []) {
    if (!s.hmac_secret) continue;
    const got = await hmacHex(s.hmac_secret, message);
    if (timingSafeEq(got, wantedSig)) { matchedSinkId = s.id; break; }
  }
  if (!matchedSinkId) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401, headers: corsHeaders });
  }

  // Idempotency: if an event exists for this issue + sink already ack'd at this level, no-op
  const { data: existingReview } = await admin.from("legal_connect_issue_reviews")
    .select("status, updated_from").eq("organization_id", orgId).eq("issue_key", issueKey).maybeSingle();
  if (existingReview?.status === action && existingReview.updated_from === "webhook") {
    return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200, headers: corsHeaders });
  }

  await applyReview(admin, orgId, issueKey, action, "webhook", actor ?? "external-webhook", note, null);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
