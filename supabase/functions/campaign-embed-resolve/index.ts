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

  // External resources — additive sibling namespace. Only enabled resources
  // are surfaced to the embed payload.
  const externalRaw = isRecord(campaign.metadata)
    ? campaign.metadata.externalResources
    : null;
  const external = isRecord(externalRaw) ? externalRaw : null;
  const allResources = Array.isArray(external?.resources) ? external!.resources : [];
  const externalResources = {
    version: 1,
    resources: allResources.filter(
      (r: unknown) => isRecord(r) && r.enabled !== false,
    ),
    rules: Array.isArray(external?.rules) ? external!.rules : [],
  };

  // Workspace display name + organization id for skin resolution.
  const wRes = await sbFetch(
    `workspaces?id=eq.${encodeURIComponent(campaign.workspace_id)}&select=id,name,organization_id&limit=1`,
  );
  const wRows = wRes.ok ? ((await wRes.json()) as any[]) : [];
  const workspace = wRows[0] ?? { id: campaign.workspace_id, name: "Workspace", organization_id: null };

  // Vertical Skin System (Phase 4) — fetch org + partner branding sources so
  // the embed runner can resolve the org's skin client-side using the same
  // Phase 3 resolver as the authenticated app. Only the public branding
  // slice is returned (integration_configs + brand_* scalars). Failures are
  // swallowed — branding is best-effort.
  let orgBranding: any = null;
  let partnerBranding: any = null;
  if (workspace.organization_id) {
    const oRes = await sbFetch(
      `organizations?id=eq.${encodeURIComponent(workspace.organization_id)}&select=id,partner_id,integration_configs,brand_name,brand_logo_url,brand_primary_color&limit=1`,
    );
    if (oRes.ok) {
      const oRows = (await oRes.json()) as any[];
      if (oRows[0]) {
        orgBranding = {
          integration_configs: oRows[0].integration_configs ?? null,
          brand_name: oRows[0].brand_name ?? null,
          brand_logo_url: oRows[0].brand_logo_url ?? null,
          brand_primary_color: oRows[0].brand_primary_color ?? null,
        };
        if (oRows[0].partner_id) {
          const pRes = await sbFetch(
            `partners?id=eq.${encodeURIComponent(oRows[0].partner_id)}&select=id,integration_configs,brand_name,brand_logo_url,brand_primary_color&limit=1`,
          );
          if (pRes.ok) {
            const pRows = (await pRes.json()) as any[];
            if (pRows[0]) {
              partnerBranding = {
                integration_configs: pRows[0].integration_configs ?? null,
                brand_name: pRows[0].brand_name ?? null,
                brand_logo_url: pRows[0].brand_logo_url ?? null,
                brand_primary_color: pRows[0].brand_primary_color ?? null,
              };
            }
          }
        }
      }
    }
  }

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
    externalResources,
    branding: { organization: orgBranding, partner: partnerBranding },
  };

  return json(payload, 200);
});
