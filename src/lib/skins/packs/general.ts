/**
 * General — neutral fallback skin. Mirrors BASE_THEME exactly.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";

const overrides = {};

export const generalSkin: Skin = {
  id: "general",
  label: "General",
  description: "Neutral platform default. Used as the fallback for any unknown skin id.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "general.default",
    campaign: "general.default",
    transferDirectory: "general.default",
    externalResources: "general.default",
    outcomes: "general.default",
  },
  copyPresetId: "general.default",
  brandHints: {
    artDirection: "Linear-style premium enterprise. Neutral surfaces, cyan primary.",
  },
};
