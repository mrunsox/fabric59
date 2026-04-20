// Five9 router — resolves a normalized Five9 event to a target client + provider.
// Handles shared-domain multi-client routing via DNIS / queue / campaign overrides.

import type { Five9NormalizedEvent } from "./five9-event-normalizer.ts";

export interface Five9RouteResolution {
  client_id: string | null;
  organization_id: string | null;
  provider_target: "clio" | "mycase" | "smokeball" | null;
  matched_route_id?: string;
  default_disposition_policy?: string;
  reason: "domain_only" | "domain_campaign" | "domain_dnis" | "domain_queue" | "unresolved";
}

interface SupabaseLite {
  from: (t: string) => any;
}

export async function resolveFive9Route(
  supabase: SupabaseLite,
  evt: Five9NormalizedEvent,
): Promise<Five9RouteResolution> {
  if (!evt.five9_domain) {
    return {
      client_id: null,
      organization_id: null,
      provider_target: null,
      reason: "unresolved",
    };
  }

  // 1. Look for explicit routes for this domain — most specific match wins (lowest priority value).
  const { data: routes } = await supabase
    .from("five9_campaign_routes")
    .select("id, client_id, organization_id, provider_target, default_disposition_policy, campaign_name, dnis, queue_id, priority")
    .eq("five9_domain", evt.five9_domain)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const candidates = (routes ?? []) as any[];

  // Most specific match: campaign + dnis + queue, then any combination, then domain-only
  const tryMatch = (
    test: (r: any) => boolean,
    reason: Five9RouteResolution["reason"],
  ): Five9RouteResolution | null => {
    const hit = candidates.find(test);
    if (!hit) return null;
    return {
      client_id: hit.client_id,
      organization_id: hit.organization_id,
      provider_target: hit.provider_target ?? null,
      matched_route_id: hit.id,
      default_disposition_policy: hit.default_disposition_policy,
      reason,
    };
  };

  if (evt.campaign_name) {
    const r = tryMatch((r) => r.campaign_name === evt.campaign_name, "domain_campaign");
    if (r) return r;
  }
  if (evt.dnis) {
    const r = tryMatch((r) => r.dnis === evt.dnis, "domain_dnis");
    if (r) return r;
  }
  if (evt.queue_id) {
    const r = tryMatch((r) => r.queue_id === evt.queue_id, "domain_queue");
    if (r) return r;
  }
  // Domain-only catch-all: a route with no campaign/dnis/queue specified
  const fallback = tryMatch(
    (r) => !r.campaign_name && !r.dnis && !r.queue_id,
    "domain_only",
  );
  if (fallback) return fallback;

  // 2. No explicit route — try implicit lookup via five9_domains → organizations → tenants.
  // We do not auto-pick a client when multiple exist; that goes to review.
  const { data: domain } = await supabase
    .from("five9_domains")
    .select("id, organization_id")
    .eq("domain", evt.five9_domain)
    .maybeSingle();

  if (!domain) {
    return { client_id: null, organization_id: null, provider_target: null, reason: "unresolved" };
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, integration_configs")
    .eq("organization_id", domain.organization_id);

  const tenantList = (tenants ?? []) as any[];
  if (tenantList.length === 1) {
    const t = tenantList[0];
    const cfg = (t.integration_configs as any) ?? {};
    const provider = cfg.clio?.enabled
      ? "clio"
      : cfg.mycase?.enabled
        ? "mycase"
        : cfg.smokeball?.enabled
          ? "smokeball"
          : null;
    return {
      client_id: t.id,
      organization_id: domain.organization_id,
      provider_target: provider,
      reason: "domain_only",
    };
  }

  // Multiple clients on this org — cannot safely auto-pick.
  return {
    client_id: null,
    organization_id: domain.organization_id,
    provider_target: null,
    reason: "unresolved",
  };
}
