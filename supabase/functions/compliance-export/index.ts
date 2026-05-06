// Audit-grade Compliance Export.
// Server-side, org-scoped, never returns secrets. Bundles:
//  - Organization + membership snapshot
//  - Integration configuration (booleans/metadata only)
//  - Legal Connect connections (status + counters; tokens stripped)
//  - Activity logs: audit_logs, platform_events, api_logs (last 90 days)
//  - RLS snapshot for in-scope tables (pg_policies)
// Records the export action into audit_logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOG_WINDOW_DAYS = 90;
const MAX_ROWS = 5000;
const RLS_TABLES = [
  "organizations", "organization_members", "tenants",
  "audit_logs", "api_logs", "platform_events",
  "legal_connect_connections", "legal_connect_event_log",
  "user_roles", "user_permissions",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripSecrets<T extends Record<string, any>>(row: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (/token|secret|password|api[_-]?key|encrypted/i.test(k)) {
      out[k] = v == null ? null : "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "auth_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "auth_invalid" }, 401);
  const userId = userRes.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const organizationId = String(body?.organization_id ?? "");
  if (!organizationId) return json({ error: "organization_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // Authorization: must be owner/admin of this org (or master_admin).
  const { data: isAdmin } = await admin.rpc("is_org_owner_or_admin", {
    _user_id: userId, _org_id: organizationId,
  });
  const { data: isMaster } = await admin.rpc("is_master_admin", { _user_id: userId });
  if (!isAdmin && !isMaster) return json({ error: "forbidden" }, 403);

  const since = new Date(Date.now() - LOG_WINDOW_DAYS * 86400_000).toISOString();

  // Organization + tenants + members (parallel)
  const [orgQ, membersQ, tenantsQ, connsQ] = await Promise.all([
    admin.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
    admin.from("organization_members").select("user_id, role, created_at")
      .eq("organization_id", organizationId),
    admin.from("tenants").select("id, name, organization_id, integration_configs, created_at, updated_at")
      .eq("organization_id", organizationId),
    admin.from("legal_connect_connections").select("*").eq("organization_id", organizationId),
  ]);

  const tenantIds = (tenantsQ.data ?? []).map((t: any) => t.id);
  const memberIds = (membersQ.data ?? []).map((m: any) => m.user_id);

  // Logs (parallel, capped)
  const [auditQ, eventsQ, apiLogsQ, lcEventsQ] = await Promise.all([
    memberIds.length
      ? admin.from("audit_logs").select("id, user_id, action, entity_type, entity_id, ip_address, created_at, details")
          .in("user_id", memberIds).gte("created_at", since).order("created_at", { ascending: false }).limit(MAX_ROWS)
      : Promise.resolve({ data: [] }),
    admin.from("platform_events").select("id, event_type, source, correlation_id, created_at, payload")
      .eq("organization_id", organizationId).gte("created_at", since).order("created_at", { ascending: false }).limit(MAX_ROWS),
    tenantIds.length
      ? admin.from("api_logs").select("id, tenant_id, endpoint, method, status, response_time_ms, created_at")
          .in("tenant_id", tenantIds).gte("created_at", since).order("created_at", { ascending: false }).limit(MAX_ROWS)
      : Promise.resolve({ data: [] }),
    admin.from("legal_connect_event_log").select("*")
      .eq("organization_id", organizationId).gte("created_at", since).order("created_at", { ascending: false }).limit(MAX_ROWS)
      .then((r) => r, () => ({ data: [] })),
  ]);

  // RLS snapshot via SECURITY DEFINER RPC over pg_policies (read-only metadata).
  const { data: policies } = await admin.rpc("get_rls_policy_snapshot", { _tables: RLS_TABLES });

  // Sanitize tenant integration_configs: keep keys + non-secret booleans/metadata.
  const tenantsSanitized = (tenantsQ.data ?? []).map((t: any) => {
    const cfg = t.integration_configs ?? {};
    const summary: Record<string, any> = {};
    for (const [provider, val] of Object.entries(cfg)) {
      if (val && typeof val === "object") {
        const v = val as Record<string, any>;
        summary[provider] = {
          enabled: !!v.enabled,
          has_oauth_token: !!v.oauthTokenId,
          has_api_key: !!v.apiKeyId,
          rules_count: Array.isArray(v.rules) ? v.rules.length : 0,
        };
      } else {
        summary[provider] = { configured: !!val };
      }
    }
    return { id: t.id, name: t.name, created_at: t.created_at, updated_at: t.updated_at, integrations: summary };
  });

  const connsSanitized = (connsQ.data ?? []).map(stripSecrets);

  const report = {
    report: "Fabric59 Audit-Grade Compliance Export",
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    generated_by: { user_id: userId, email: userRes.user.email ?? null },
    window: { days: LOG_WINDOW_DAYS, since },
    row_caps: { per_log_table: MAX_ROWS },
    organization: orgQ.data ?? null,
    membership: membersQ.data ?? [],
    tenants: tenantsSanitized,
    connections: connsSanitized,
    activity: {
      audit_logs: auditQ.data ?? [],
      platform_events: eventsQ.data ?? [],
      api_logs: apiLogsQ.data ?? [],
      legal_connect_events: lcEventsQ.data ?? [],
    },
    rls_snapshot: {
      tables: RLS_TABLES,
      policies: policies ?? [],
      note: "Snapshot of pg_policies for in-scope tables at export time.",
    },
    redactions: [
      "All *_token, *_secret, *_password, *_api_key, *_encrypted columns are masked as [REDACTED].",
      "api_logs request/response payload bodies are excluded; only metadata is returned.",
      "platform_events.payload is included verbatim — review before sharing externally.",
    ],
  };

  // Record the export in audit_logs.
  await admin.from("audit_logs").insert({
    user_id: userId,
    action: "compliance_export.generated",
    entity_type: "organization",
    entity_id: organizationId,
    details: {
      window_days: LOG_WINDOW_DAYS,
      counts: {
        members: membersQ.data?.length ?? 0,
        tenants: tenantsQ.data?.length ?? 0,
        connections: connsQ.data?.length ?? 0,
        audit_logs: auditQ.data?.length ?? 0,
        platform_events: eventsQ.data?.length ?? 0,
        api_logs: apiLogsQ.data?.length ?? 0,
      },
    },
  });

  return json(report);
});
