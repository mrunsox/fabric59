// Five9 Overlay test endpoint — runs the full normalize → route → map → orchestrate
// pipeline using REAL adapters via the provider registry. dryRun (default true)
// short-circuits at the orchestrator so no provider API calls are made.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { normalizeFive9Event } from "../_shared/five9-event-normalizer.ts";
import { resolveFive9Route } from "../_shared/five9-router.ts";
import { buildActionChain } from "../_shared/disposition-mapping-engine.ts";
import { executeActionChain } from "../_shared/writeback-orchestrator.ts";
import { getAdapter, loadCapabilities } from "../_shared/provider-registry.ts";
import "../_shared/register-adapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { raw_payload, target_client_id, target_provider, dryRun = true } = body;
    if (!raw_payload) {
      return new Response(JSON.stringify({ error: "raw_payload required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Stage 1 — normalize
    const normalized = normalizeFive9Event(raw_payload, { event_type: "test" });

    // Stage 2 — route (use override if provided)
    let route;
    let resolvedConnectionId: string | null = null;
    if (target_client_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, organization_id, integration_configs")
        .eq("id", target_client_id)
        .single();
      const cfg = (tenant?.integration_configs as any) ?? {};
      const provider =
        target_provider ??
        (cfg.clio?.enabled ? "clio" : cfg.mycase?.enabled ? "mycase" : cfg.smokeball?.enabled ? "smokeball" : null);
      route = {
        client_id: tenant?.id ?? null,
        organization_id: tenant?.organization_id ?? null,
        provider_target: provider,
        reason: "override" as const,
      };
    } else {
      route = await resolveFive9Route(supabase, normalized);
    }

    // Find a connection for that client + provider (used both for adapter context
    // and to gate live runs).
    if (route.client_id && route.provider_target) {
      const { data: conn } = await supabase
        .from("legal_connect_connections")
        .select("id, status")
        .eq("client_id", route.client_id)
        .eq("provider", route.provider_target)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedConnectionId = conn?.id ?? null;
    }

    // Stage 3 — find disposition mapping
    let mapping = null;
    if (route.client_id && normalized.disposition) {
      const { data } = await supabase
        .from("legal_connect_disposition_mappings")
        .select("*")
        .eq("client_id", route.client_id)
        .eq("disposition_code", normalized.disposition)
        .maybeSingle();
      mapping = data;
    }

    // Stage 4 — capabilities + action chain
    let action_result = { actions: [], review_items: [], warnings: [] as string[] };
    let orchestration: any = null;
    if (route.provider_target) {
      const caps = await loadCapabilities(supabase, route.provider_target);
      action_result = buildActionChain(normalized, mapping as any, route.provider_target, caps);

      // Stage 5 — orchestrate via REAL adapter (dryRun by default)
      const adapter = getAdapter(route.provider_target);
      if (!adapter) {
        action_result.warnings.push(`No adapter registered for provider "${route.provider_target}"`);
      } else if (!dryRun && !resolvedConnectionId) {
        action_result.warnings.push(
          `Cannot run live: no connected ${route.provider_target} connection for this client`,
        );
      } else {
        const ctx = {
          connection_id: resolvedConnectionId ?? "dry-run",
          client_id: route.client_id ?? "",
          organization_id: route.organization_id ?? "",
          provider: route.provider_target as any,
        };
        orchestration = await executeActionChain(adapter, ctx, action_result.actions, dryRun);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        normalized,
        route: { ...route, connection_id: resolvedConnectionId },
        action_chain: action_result.actions,
        execution: { dryRun, results: orchestration },
        stages: {
          mapping_found: Boolean(mapping),
          mapping_id: (mapping as any)?.id ?? null,
          review_items: action_result.review_items,
          warnings: action_result.warnings,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("five9-overlay-test error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
