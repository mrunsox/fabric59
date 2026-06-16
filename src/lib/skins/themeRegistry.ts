/**
 * Vertical Skin System — Phase 2
 * Canonical skin registry. Backed by per-vertical pack modules.
 *
 * SkinId is canonical in `@/lib/theme/types` (Phase 1) and re-exported
 * via `@/lib/skins/types` — there is no second source of truth.
 *
 * Phase 2 contract: 10 real packs, `general` as the deterministic
 * fallback. The resolver in `@/lib/theme/themeResolver` consumes the
 * `tokens` field on each pack unchanged.
 */

import type { SkinId } from "@/lib/theme/types";
import type { Skin } from "@/lib/skins/types";

import { generalSkin } from "./packs/general";
import { legalSkin } from "./packs/legal";
import { medicalSkin } from "./packs/medical";
import { financialSkin } from "./packs/financial";
import { propertyManagementSkin } from "./packs/propertyManagement";
import { professionalServicesSkin } from "./packs/professionalServices";
import { homeServicesSkin } from "./packs/homeServices";
import { ecommerceSkin } from "./packs/ecommerce";
import { insuranceSkin } from "./packs/insurance";
import { educationSkin } from "./packs/education";

export const FALLBACK_SKIN_ID: SkinId = "general";

/** Stable display order — drives `listSkins()` and admin pickers. */
export const ALL_SKIN_IDS: readonly SkinId[] = [
  "general",
  "legal",
  "medical",
  "financial",
  "insurance",
  "professional_services",
  "property_management",
  "home_services",
  "ecommerce",
  "education",
] as const;

const REGISTRY: Record<SkinId, Skin> = {
  general: generalSkin,
  legal: legalSkin,
  medical: medicalSkin,
  financial: financialSkin,
  property_management: propertyManagementSkin,
  professional_services: professionalServicesSkin,
  home_services: homeServicesSkin,
  ecommerce: ecommerceSkin,
  insurance: insuranceSkin,
  education: educationSkin,
};

export function getSkin(id?: SkinId | null): Skin {
  if (!id) return REGISTRY[FALLBACK_SKIN_ID];
  return REGISTRY[id] ?? REGISTRY[FALLBACK_SKIN_ID];
}

export function listSkins(): readonly Skin[] {
  return ALL_SKIN_IDS.map((id) => REGISTRY[id]);
}
