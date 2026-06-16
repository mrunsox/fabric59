/**
 * Vertical Skin System — Phase 5
 * Starter-pack resolver.
 *
 * Each Phase 2 skin pack declares `starterPacks: StarterPackBindings`
 * pointing at preset ids per surface (guide, campaign, transfer
 * directory, external resources, outcomes). Phase 5 adds:
 *
 *  - `getStarterPacks(skinId)` — deterministic lookup with `general`
 *    fallback for unknown skins or missing fields.
 *
 *  - resolver bridges into the existing template registries
 *    (`workspace-guide/templates` and `campaign-flow/templates`) so
 *    consumers can ask for the starter content bound to the active
 *    skin without component-level branching.
 *
 * Bindings are intentionally conservative: only `legal` has bespoke
 * starter content today. Every other vertical resolves to the neutral
 * `generic` template until per-vertical content lands. The mapping
 * tables below are the single place to extend coverage — no consumer
 * code needs to change as new vertical templates ship.
 */

import type { SkinId } from "@/lib/theme/types";
import {
  ALL_SKIN_IDS,
  FALLBACK_SKIN_ID,
  getSkin,
} from "@/lib/skins/themeRegistry";
import type { StarterPackBindings } from "@/lib/skins/types";
import {
  WORKSPACE_GUIDE_TEMPLATES,
  getTemplate as getGuideTemplate,
} from "@/lib/workspace-guide/templates";
import {
  CAMPAIGN_FLOW_TEMPLATES,
  getCampaignFlowTemplate,
} from "@/lib/campaign-flow/templates";
import type { WorkspaceGuideTemplate } from "@/types/workspace-guide";
import type { CampaignFlowTemplate } from "@/types/campaign-flow";

// ---------------------------------------------------------------------------
// Starter-pack id → existing template id bridges.
// Keys are the starter-pack ids declared on the skin packs in Phase 2.
// Values are the canonical template ids in the existing registries.
// Missing entries deliberately fall back to the `generic` template.
// ---------------------------------------------------------------------------

const GUIDE_TEMPLATE_BY_STARTER_ID: Record<string, string> = {
  "general.default": "generic",
  "legal.default": "legal-firm-starter",
  // Medical / financial / insurance / professional_services /
  // property_management / home_services / ecommerce / education
  // intentionally fall through to `generic` until bespoke guide
  // templates ship. The fallback is documented and tested.
};

const CAMPAIGN_TEMPLATE_BY_STARTER_ID: Record<string, string> = {
  "general.default": "generic-intake",
  "legal.default": "legal-intake",
  // Other verticals fall through to `generic-intake`.
};

const FALLBACK_GUIDE_TEMPLATE_ID = "generic";
const FALLBACK_CAMPAIGN_TEMPLATE_ID = "generic-intake";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the starter-pack id bindings for a skin. Always returns a
 * defined bindings object: unknown skin → `general`. Missing individual
 * fields are preserved as-is so callers can still detect "no binding"
 * if they need to (e.g. admin diff UI). Use the `resolve*` helpers
 * below to get fallback-aware concrete results.
 */
export function getStarterPacks(skinId: SkinId | null | undefined): StarterPackBindings {
  const skin = getSkin(skinId ?? FALLBACK_SKIN_ID);
  return skin.starterPacks ?? {};
}

/** Resolve the guide template bound to a skin, falling back to `general`. */
export function resolveGuideTemplateForSkin(
  skinId: SkinId | null | undefined,
): WorkspaceGuideTemplate {
  const starterId = getStarterPacks(skinId).guide;
  const mappedId = (starterId && GUIDE_TEMPLATE_BY_STARTER_ID[starterId]) || FALLBACK_GUIDE_TEMPLATE_ID;
  return (
    getGuideTemplate(mappedId) ??
    getGuideTemplate(FALLBACK_GUIDE_TEMPLATE_ID) ??
    WORKSPACE_GUIDE_TEMPLATES[0]
  );
}

/** Resolve the campaign template bound to a skin, falling back to `general`. */
export function resolveCampaignTemplateForSkin(
  skinId: SkinId | null | undefined,
): CampaignFlowTemplate {
  const starterId = getStarterPacks(skinId).campaign;
  const mappedId = (starterId && CAMPAIGN_TEMPLATE_BY_STARTER_ID[starterId]) || FALLBACK_CAMPAIGN_TEMPLATE_ID;
  return (
    getCampaignFlowTemplate(mappedId) ??
    getCampaignFlowTemplate(FALLBACK_CAMPAIGN_TEMPLATE_ID) ??
    CAMPAIGN_FLOW_TEMPLATES[0]
  );
}

/**
 * Diagnostic snapshot: every canonical skin and its resolved starter ids.
 * Useful for admin previews and tests. Deterministic order matches
 * `ALL_SKIN_IDS`.
 */
export function listStarterPackBindings(): Array<{
  skinId: SkinId;
  bindings: StarterPackBindings;
}> {
  return ALL_SKIN_IDS.map((id) => ({ skinId: id, bindings: getStarterPacks(id) }));
}

export {
  GUIDE_TEMPLATE_BY_STARTER_ID,
  CAMPAIGN_TEMPLATE_BY_STARTER_ID,
  FALLBACK_GUIDE_TEMPLATE_ID,
  FALLBACK_CAMPAIGN_TEMPLATE_ID,
};
