// Shared JWT validation helper for edge functions that must require auth.
//
// Usage:
//   const auth = await requireUser(req);
//   if (!auth.ok) return auth.response;
//   const userId = auth.user.id;
//
// Optionally also require org membership:
//   const orgCheck = await requireOrgMember(auth.user.id, organization_id);
//   if (!orgCheck.ok) return orgCheck.response;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { corsHeaders, jsonResponse } from "./cors.ts";

type RequireUserResult =
  | { ok: true; user: { id: string; email?: string | null }; token: string }
  | { ok: false; response: Response };

export async function requireUser(req: Request): Promise<RequireUserResult> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }
  const token = authHeader.slice("bearer ".length).trim();
  if (!token) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return { ok: false, response: jsonResponse({ error: "Auth not configured" }, 500) };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  return { ok: true, user: { id: data.user.id, email: data.user.email }, token };
}

type RequireOrgResult = { ok: true } | { ok: false; response: Response };

export async function requireOrgMember(userId: string, organizationId: string | null | undefined, opts?: { adminOnly?: boolean }): Promise<RequireOrgResult> {
  if (!organizationId) {
    return { ok: false, response: jsonResponse({ error: "organization_id required" }, 400) };
  }
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE) {
    return { ok: false, response: jsonResponse({ error: "Service not configured" }, 500) };
  }
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

  // Master admin bypass
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isMaster = (roles ?? []).some((r: any) => r.role === "master_admin" || r.role === "admin");
  if (isMaster) return { ok: true };

  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!member) {
    return { ok: false, response: jsonResponse({ error: "Forbidden" }, 403) };
  }
  if (opts?.adminOnly && !["owner", "admin"].includes((member as any).role)) {
    return { ok: false, response: jsonResponse({ error: "Forbidden" }, 403) };
  }
  return { ok: true };
}

export { corsHeaders };
