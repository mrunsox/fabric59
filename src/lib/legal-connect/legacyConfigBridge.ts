// Client-side read-through bridge: surfaces a unified "connection" view
// regardless of whether a client uses the new `legal_connect_connections`
// row or the legacy `tenants.integration_configs` blob.
//
// New saves should always go through `useCreateLegalConnection`. This module
// is read-only.

import { supabase } from "@/integrations/supabase/client";

export type ProviderKey = "clio" | "mycase" | "smokeball";

export interface LegalConnectConnectionDraft {
  source: "legal_connect" | "legacy";
  id?: string;
  client_id: string;
  organization_id: string | null;
  provider: ProviderKey;
  status: "connected" | "not_connected" | "expired" | "error" | "revoked" | "testing";
  connection_name?: string | null;
  metadata?: Record<string, unknown>;
  legacy_oauth_token_id?: string | null;
  legacy_api_key_id?: string | null;
}

export async function resolveProviderConnection(
  clientId: string,
  provider: ProviderKey,
): Promise<LegalConnectConnectionDraft | null> {
  // 1) Preferred: legal_connect_connections row
  const { data: row } = await supabase
    .from("legal_connect_connections")
    .select("*")
    .eq("client_id", clientId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (row) {
    return {
      source: "legal_connect",
      id: row.id,
      client_id: row.client_id,
      organization_id: row.organization_id,
      provider: row.provider as ProviderKey,
      status: row.status as LegalConnectConnectionDraft["status"],
      connection_name: row.connection_name ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    };
  }

  // 2) Legacy fallback (clio / mycase only)
  if (provider !== "clio" && provider !== "mycase") return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, organization_id, integration_configs")
    .eq("id", clientId)
    .maybeSingle();

  if (!tenant) return null;
  const cfg = (tenant.integration_configs as any) ?? {};
  const block = cfg[provider];
  if (!block || block.enabled === false) return null;

  if (provider === "clio" && block.oauthTokenId) {
    return {
      source: "legacy",
      client_id: clientId,
      organization_id: tenant.organization_id,
      provider: "clio",
      status: "connected",
      metadata: { rules: block.rules ?? null },
      legacy_oauth_token_id: block.oauthTokenId,
    };
  }

  if (provider === "mycase" && block.apiKeyId) {
    return {
      source: "legacy",
      client_id: clientId,
      organization_id: tenant.organization_id,
      provider: "mycase",
      status: "connected",
      metadata: { rules: block.rules ?? null },
      legacy_api_key_id: block.apiKeyId,
    };
  }

  return null;
}

/** True if the legacy block exists but no `legal_connect_connections` row yet. */
export async function isLegacyOnly(clientId: string, provider: ProviderKey): Promise<boolean> {
  const conn = await resolveProviderConnection(clientId, provider);
  return conn?.source === "legacy";
}
