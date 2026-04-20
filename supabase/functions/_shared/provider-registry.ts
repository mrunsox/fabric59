// Provider registry — maps provider key → adapter instance + capability lookup.
// Adapters import from here; orchestration code dispatches via this registry
// rather than hardcoding `if (provider === "clio")` branches.

import type { LegalCrmAdapter } from "./legal-crm-adapter.ts";

type ProviderKey = "clio" | "mycase" | "smokeball";

const adapters = new Map<ProviderKey, LegalCrmAdapter>();

export function registerAdapter(adapter: LegalCrmAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getAdapter(provider: string): LegalCrmAdapter | null {
  return adapters.get(provider as ProviderKey) ?? null;
}

export function listAdapters(): LegalCrmAdapter[] {
  return Array.from(adapters.values());
}

// Capability lookup — fetched once per request and cached locally.
// Caller passes a Supabase client to avoid coupling this module to env.
export interface ProviderCapability {
  provider: string;
  capability_key: string;
  capability_name: string;
  supported: boolean;
  support_mode: "native" | "conditional" | "manual_only" | "unsupported";
  notes?: string | null;
}

const capabilityCache = new Map<string, ProviderCapability[]>();
const CAPABILITY_TTL_MS = 5 * 60 * 1000;
const cacheStamps = new Map<string, number>();

export async function loadCapabilities(
  supabase: { from: (t: string) => any },
  provider: string,
): Promise<ProviderCapability[]> {
  const stamp = cacheStamps.get(provider) ?? 0;
  if (Date.now() - stamp < CAPABILITY_TTL_MS && capabilityCache.has(provider)) {
    return capabilityCache.get(provider)!;
  }
  const { data, error } = await supabase
    .from("legal_connect_provider_capabilities")
    .select("provider, capability_key, capability_name, supported, support_mode, notes")
    .eq("provider", provider);
  if (error) throw new Error(`Failed to load capabilities for ${provider}: ${error.message}`);
  capabilityCache.set(provider, data ?? []);
  cacheStamps.set(provider, Date.now());
  return data ?? [];
}

export function isCapabilitySupported(caps: ProviderCapability[], key: string): boolean {
  const c = caps.find((x) => x.capability_key === key);
  return Boolean(c?.supported);
}

export function capabilitySupportMode(caps: ProviderCapability[], key: string): string {
  const c = caps.find((x) => x.capability_key === key);
  return c?.support_mode ?? "unsupported";
}
