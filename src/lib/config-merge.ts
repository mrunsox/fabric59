import type { IntegrationConfigs } from "@/types/integrations";

/**
 * Deep merge integration configs with precedence: client > partner > org.
 * Only merges plain objects; arrays and primitives are replaced entirely.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function deepMergeTwo(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    if (override[key] === undefined) continue;

    if (isPlainObject(base[key]) && isPlainObject(override[key])) {
      result[key] = deepMergeTwo(
        base[key] as Record<string, unknown>,
        override[key] as Record<string, unknown>
      );
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Merges integration configs from org → partner → client.
 * Client-level values take highest precedence.
 */
export function resolveEffectiveConfig(
  org: IntegrationConfigs | null | undefined,
  partner: IntegrationConfigs | null | undefined,
  client: IntegrationConfigs | null | undefined
): IntegrationConfigs {
  return mergeIntegrationConfigs(org, partner, client);
}

/**
 * Merges integration configs from org → partner → client.
 * Client-level values take highest precedence.
 */
export function mergeIntegrationConfigs(
  org: IntegrationConfigs | null | undefined,
  partner: IntegrationConfigs | null | undefined,
  client: IntegrationConfigs | null | undefined
): IntegrationConfigs {
  const base = (org || {}) as Record<string, unknown>;
  const mid = (partner || {}) as Record<string, unknown>;
  const top = (client || {}) as Record<string, unknown>;

  return deepMergeTwo(deepMergeTwo(base, mid), top) as IntegrationConfigs;
}
