// Edge function: campaign-embed-resolve
//
// Purpose: resolve the minimum payload required to render the published embed
// runner for a given campaign. Enforces publish.enabled and (when applicable)
// token access server-side using the service role, so the public iframe never
// needs to satisfy authenticated-only RLS.
//
// Strict contract — only the fields documented in
// docs/campaign-publish-embed-architecture.md §4 are returned. The token is
// NEVER echoed back. Raw tokens are never logged.

// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PUBLISH_VERSION = 1;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

async function sbFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { campaignId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const campaignId = body.campaignId?.trim();
  if (!campaignId || campaignId.length > 64) {
    return json({ error: "invalid_campaign_id" }, 400);
  }
  const providedToken = typeof body.token === "string" ? body.token.trim() : null;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  // Fetch the campaign — minimal columns only.
  const cRes = await sbFetch(
    `campaigns?id=eq.${encodeURIComponent(campaignId)}&select=id,name,workspace_id,metadata&limit=1`,
  );
  if (!cRes.ok) {
    return json({ error: "lookup_failed" }, 502);
  }
  const cRows = (await cRes.json()) as any[];
  const campaign = cRows[0];
  // Indistinguishable terminal state for not-found / disabled / access-denied.
  // (We branch internally for logging accuracy but return the same envelope.)
  if (!campaign) return json({ error: "unavailable" }, 404);

  const publishRaw = isRecord(campaign.metadata) ? campaign.metadata.publish : null;
  const publish = isRecord(publishRaw) ? publishRaw : null;
  const enabled = publish?.enabled === true;
  if (!enabled) return json({ error: "unavailable" }, 404);

  const access = publish?.access === "token" ? "token" : "public";
  if (access === "token") {
    const stored = typeof publish?.token === "string" ? publish.token : "";
    if (!stored || !providedToken || !safeCompare(stored, providedToken)) {
      // Never echo or log the raw token.
      return json({ error: "unavailable" }, 404);
    }
  }

  const theme = typeof publish?.theme === "string" ? publish.theme : "light";
  const transferDirRaw = isRecord(campaign.metadata)
    ? campaign.metadata.transferDirectory
    : null;
  const transferDir = isRecord(transferDirRaw) ? transferDirRaw : null;
  const entries = Array.isArray(transferDir?.entries) ? transferDir!.entries : [];
  const rules = Array.isArray(transferDir?.rules) ? transferDir!.rules : [];

  // Workspace display name.
  const wRes = await sbFetch(
    `workspaces?id=eq.${encodeURIComponent(campaign.workspace_id)}&select=id,name&limit=1`,
  );
  const wRows = wRes.ok ? ((await wRes.json()) as any[]) : [];
  const workspace = wRows[0] ?? { id: campaign.workspace_id, name: "Workspace" };

  // Published guide (workspace-scoped singleton).
  const gRes = await sbFetch(
    `guides?workspace_id=eq.${encodeURIComponent(campaign.workspace_id)}&name=eq.__workspace_guide__&select=id&limit=1`,
  );
  let guideContent: unknown = null;
  if (gRes.ok) {
    const gRows = (await gRes.json()) as any[];
    if (gRows[0]?.id) {
      const gvRes = await sbFetch(
        `guide_versions?guide_id=eq.${encodeURIComponent(gRows[0].id)}&is_current=eq.true&select=content&limit=1`,
      );
      if (gvRes.ok) {
        const gvRows = (await gvRes.json()) as any[];
        guideContent = gvRows[0]?.content ?? null;
      }
    }
  }

  // Published campaign flow.
  const fRes = await sbFetch(
    `guides?campaign_id=eq.${encodeURIComponent(campaignId)}&name=eq.__campaign_flow__&select=id&limit=1`,
  );
  let flowContent: unknown = null;
  if (fRes.ok) {
    const fRows = (await fRes.json()) as any[];
    if (fRows[0]?.id) {
      const fvRes = await sbFetch(
        `guide_versions?guide_id=eq.${encodeURIComponent(fRows[0].id)}&is_current=eq.true&select=content&limit=1`,
      );
      if (fvRes.ok) {
        const fvRows = (await fvRes.json()) as any[];
        flowContent = fvRows[0]?.content ?? null;
      }
    }
  }

  // Minimal payload contract — see docs/campaign-publish-embed-architecture.md §4.
  const payload = {
    campaign: { id: campaign.id, name: campaign.name },
    workspace: { id: workspace.id, name: workspace.name },
    publish: {
      enabled: true,
      theme,
      access,
      version: PUBLISH_VERSION,
      // NOTE: token deliberately omitted.
    },
    guide: guideContent,
    flow: flowContent,
    transferDirectory: { entries, rules },
  };

  return json(payload, 200);
});
