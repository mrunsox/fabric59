/**
 * Vertical Skin System — Phase 1
 * Skin registry foundation.
 *
 * Phase 1 only ships the `general` fallback skin, which is a bit-for-bit
 * mirror of BASE_THEME. The 10 canonical vertical skins are populated in
 * Phase 2 — until then, every SkinId resolves to `general`.
 */

import { BASE_THEME } from "@/lib/theme/baseTheme";
import type { Skin, SkinId } from "@/lib/theme/types";

export const FALLBACK_SKIN_ID: SkinId = "general";

export const ALL_SKIN_IDS: readonly SkinId[] = [
  "legal",
  "medical",
  "financial",
  "property_management",
  "professional_services",
  "home_services",
  "ecommerce",
  "general",
  "insurance",
  "education",
] as const;

const generalSkin: Skin = {
  id: "general",
  label: "General",
  tokens: BASE_THEME,
};

/**
 * Registry map. Phase 2 will replace the `general`-cloned entries with
 * vertical-specific token packs. Phase 1 keeps the contract stable.
 */
const REGISTRY: Record<SkinId, Skin> = {
  legal: generalSkin,
  medical: generalSkin,
  financial: generalSkin,
  property_management: generalSkin,
  professional_services: generalSkin,
  home_services: generalSkin,
  ecommerce: generalSkin,
  general: generalSkin,
  insurance: generalSkin,
  education: generalSkin,
};

export function getSkin(id?: SkinId | null): Skin {
  if (!id) return REGISTRY[FALLBACK_SKIN_ID];
  return REGISTRY[id] ?? REGISTRY[FALLBACK_SKIN_ID];
}

export function listSkins(): readonly Skin[] {
  return ALL_SKIN_IDS.map((id) => REGISTRY[id]);
}
