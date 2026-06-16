/**
 * ASC wizard feature flag — Slice 2.
 *
 * Resolution order (highest precedence first):
 *   1. Dev override (DEV builds only): localStorage `fabric59.features.ascWizard.enabled` = "1"
 *      The `import.meta.env.DEV` guard ensures Vite dead-code-eliminates this branch
 *      in production bundles, so end users can never enable ASC by writing to localStorage.
 *   2. Merged config (Client > Partner > Org): `features.ascWizard.enabled === true`.
 *      Only the literal boolean `true` enables ASC; strings, 1, "true", null, or any
 *      malformed value resolve to `false` (defensive).
 *   3. Default: `false`.
 *
 * Slice 2 reads the org config from AuthContext. Partner / Client configs are
 * left as optional inputs on the pure resolver so the same logic can be reused
 * when ASC is later launched from a client-scoped surface.
 */
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mergeIntegrationConfigs } from "@/lib/config-merge";
import type { IntegrationConfigs } from "@/types/integrations";

const STORAGE_KEY = "fabric59.features.ascWizard.enabled";

export type AscFlagSource =
  | "dev-override"
  | "client"
  | "partner"
  | "org"
  | "default";

export interface AscFlagResolution {
  enabled: boolean;
  source: AscFlagSource;
}

/**
 * Pure resolver — defensive against malformed config values.
 * Returns `true` ONLY for explicit boolean `true` after merge.
 */
export function resolveAscWizardFlagFromConfigs(
  client: IntegrationConfigs | null | undefined,
  partner: IntegrationConfigs | null | undefined,
  org: IntegrationConfigs | null | undefined,
): AscFlagResolution {
  // Determine source by checking each tier for an explicit `true` from
  // narrowest scope outward. The merged value still wins for `enabled`, but
  // sourcing tells operators where the on-switch lives.
  const readEnabled = (cfg: IntegrationConfigs | null | undefined): boolean => {
    if (!cfg || typeof cfg !== "object") return false;
    const features = (cfg as Record<string, unknown>).features;
    if (!features || typeof features !== "object") return false;
    const asc = (features as Record<string, unknown>).ascWizard;
    if (!asc || typeof asc !== "object") return false;
    const enabled = (asc as Record<string, unknown>).enabled;
    return enabled === true;
  };

  const merged = mergeIntegrationConfigs(org ?? null, partner ?? null, client ?? null);
  if (!readEnabled(merged)) {
    return { enabled: false, source: "default" };
  }

  if (readEnabled(client)) return { enabled: true, source: "client" };
  if (readEnabled(partner)) return { enabled: true, source: "partner" };
  if (readEnabled(org)) return { enabled: true, source: "org" };
  return { enabled: true, source: "org" };
}

/**
 * Dev-only escape hatch. Stripped from production bundles by the
 * `import.meta.env.DEV` guard (Vite dead-code-eliminates the branch).
 */
function readDevOverride(opts?: {
  storage?: Pick<Storage, "getItem">;
}): boolean {
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

/**
 * Composite resolver used by the hook and tests. Accepts an explicit storage
 * stub so unit tests can drive the dev override deterministically.
 */
export function resolveAscWizardFlag(
  inputs: {
    client?: IntegrationConfigs | null;
    partner?: IntegrationConfigs | null;
    org?: IntegrationConfigs | null;
  } = {},
  opts?: { storage?: Pick<Storage, "getItem"> },
): AscFlagResolution {
  if (readDevOverride(opts)) {
    return { enabled: true, source: "dev-override" };
  }
  return resolveAscWizardFlagFromConfigs(
    inputs.client ?? null,
    inputs.partner ?? null,
    inputs.org ?? null,
  );
}

export function useAscWizardFlag(
  _workspaceId?: string,
): AscFlagResolution {
  const { organization } = useAuth();
  const orgConfigs = (organization?.integration_configs ?? null) as
    | IntegrationConfigs
    | null;
  // Partner/Client scopes are not addressable from the /new route in Slice 2.
  // When a client-scoped ASC entry point ships, pass those configs through here.
  return useMemo(
    () => resolveAscWizardFlag({ org: orgConfigs }),
    [orgConfigs],
  );
}

export const ASC_FLAG_STORAGE_KEY = STORAGE_KEY;
