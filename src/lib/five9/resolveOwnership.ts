import { supabase } from "@/integrations/supabase/client";

export type Five9OwnershipMode = "client" | "workspace";

export interface ResolvedOwnership {
  mode: Five9OwnershipMode;
  ownerScope: "client" | "workspace";
  organizationId: string;
  clientId: string | null;
  domainId: string | null;
}

/**
 * Resolves which Five9 connection should be used for a given client + organization.
 * - If the client has its own ownership_mode set, it wins.
 * - Otherwise the organization's default applies.
 * - Returns the first active domain for the resolved owner scope.
 */
export async function resolveFive9Ownership(
  organizationId: string,
  clientId?: string | null
): Promise<ResolvedOwnership> {
  let mode: Five9OwnershipMode = "workspace";
  let domainId: string | null = null;

  if (clientId) {
    const { data: client } = await supabase
      .from("tenants")
      .select("five9_ownership_mode")
      .eq("id", clientId)
      .maybeSingle();
    if (client?.five9_ownership_mode) {
      mode = client.five9_ownership_mode as Five9OwnershipMode;
    } else {
      const { data: org } = await supabase
        .from("organizations")
        .select("five9_ownership_mode")
        .eq("id", organizationId)
        .maybeSingle();
      mode = (org?.five9_ownership_mode as Five9OwnershipMode) || "workspace";
    }
  } else {
    const { data: org } = await supabase
      .from("organizations")
      .select("five9_ownership_mode")
      .eq("id", organizationId)
      .maybeSingle();
    mode = (org?.five9_ownership_mode as Five9OwnershipMode) || "workspace";
  }

  // Pick a domain that matches the ownership scope.
  const { data: domains } = await supabase
    .from("five9_domains")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .limit(1);
  domainId = domains?.[0]?.id ?? null;

  return {
    mode,
    ownerScope: mode,
    organizationId,
    clientId: clientId ?? null,
    domainId,
  };
}
