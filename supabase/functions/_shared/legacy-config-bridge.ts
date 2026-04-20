// Server-side legacy config bridge — read-through fallback that projects a
// tenant's legacy `integration_configs.{clio|mycase}` blob into a shape that
// looks like a `legal_connect_connections` row. Read-only, no writes.
//
// Used by `legal-connect-jobs` so older tenants that never went through the
// new Legal Connect wizard still execute writes correctly.

export interface LegacyConnectionDraft {
  source: "legacy";
  client_id: string;
  organization_id: string | null;
  provider: "clio" | "mycase";
  status: "connected";
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  metadata: Record<string, unknown>;
  legacy_oauth_token_id?: string | null;
  legacy_api_key_id?: string | null;
}

export async function resolveLegacyConnection(
  supabase: { from: (t: string) => any },
  clientId: string,
  provider: string,
): Promise<LegacyConnectionDraft | null> {
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
      organization_id: tenant.organization_id ?? null,
      provider: "clio",
      status: "connected",
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      metadata: { rules: block.rules ?? null },
      legacy_oauth_token_id: block.oauthTokenId,
    };
  }

  if (provider === "mycase" && block.apiKeyId) {
    return {
      source: "legacy",
      client_id: clientId,
      organization_id: tenant.organization_id ?? null,
      provider: "mycase",
      status: "connected",
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      metadata: { rules: block.rules ?? null },
      legacy_api_key_id: block.apiKeyId,
    };
  }

  return null;
}
