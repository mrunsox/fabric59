/**
 * Business Brain feature flag — mirrors ASC flag resolution semantics.
 *
 * Resolution order (highest precedence first):
 *   1. Dev override (DEV builds only): localStorage `fabric59.features.businessBrain.enabled` = "1"
 *   2. Merged config (Client > Partner > Org): `features.businessBrain.enabled === true`.
 *   3. Default: `false`.
 */
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mergeIntegrationConfigs } from "@/lib/config-merge";
import type { IntegrationConfigs } from "@/types/integrations";

const STORAGE_KEY = "fabric59.features.businessBrain.enabled";

export type BbFlagSource =
  | "dev-override"
  | "client"
  | "partner"
  | "org"
  | "default";

export interface BbFlagResolution {
  enabled: boolean;
  source: BbFlagSource;
}

export function resolveBusinessBrainFlagFromConfigs(
  client: IntegrationConfigs | null | undefined,
  partner: IntegrationConfigs | null | undefined,
  org: IntegrationConfigs | null | undefined,
): BbFlagResolution {
  const read = (cfg: IntegrationConfigs | null | undefined): boolean => {
    if (!cfg || typeof cfg !== "object") return false;
    const features = (cfg as Record<string, unknown>).features;
    if (!features || typeof features !== "object") return false;
    const bb = (features as Record<string, unknown>).businessBrain;
    if (!bb || typeof bb !== "object") return false;
    return (bb as Record<string, unknown>).enabled === true;
  };

  const merged = mergeIntegrationConfigs(org ?? null, partner ?? null, client ?? null);
  if (!read(merged)) return { enabled: false, source: "default" };
  if (read(client)) return { enabled: true, source: "client" };
  if (read(partner)) return { enabled: true, source: "partner" };
  if (read(org)) return { enabled: true, source: "org" };
  return { enabled: true, source: "org" };
}

function readDevOverride(opts?: { storage?: Pick<Storage, "getItem"> }): boolean {
  if (!import.meta.env.DEV) return false;
  const storage =
    opts?.storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function resolveBusinessBrainFlag(
  inputs: {
    client?: IntegrationConfigs | null;
    partner?: IntegrationConfigs | null;
    org?: IntegrationConfigs | null;
  } = {},
  opts?: { storage?: Pick<Storage, "getItem"> },
): BbFlagResolution {
  if (readDevOverride(opts)) return { enabled: true, source: "dev-override" };
  return resolveBusinessBrainFlagFromConfigs(
    inputs.client ?? null,
    inputs.partner ?? null,
    inputs.org ?? null,
  );
}

export function useBusinessBrainFlag(): BbFlagResolution {
  const { organization } = useAuth();
  const orgConfigs = (organization?.integration_configs ?? null) as
    | IntegrationConfigs
    | null;
  return useMemo(() => resolveBusinessBrainFlag({ org: orgConfigs }), [orgConfigs]);
}

export const BB_FLAG_STORAGE_KEY = STORAGE_KEY;
