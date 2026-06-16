/**
 * Property Management — terracotta/burnt orange primary with warm tan accent.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "18 72% 46%",
      primaryForeground: "0 0% 100%",
      accent: "32 60% 60%",
      accentForeground: "222 47% 11%",
      ring: "18 72% 46%",
      info: "18 72% 46%",
      chart1: "18 72% 46%",
      chart2: "32 60% 60%",
    },
  },
  dark: {
    colors: {
      primary: "18 78% 58%",
      primaryForeground: "0 0% 100%",
      accent: "32 60% 62%",
      accentForeground: "222 47% 11%",
      ring: "18 78% 58%",
      info: "18 78% 58%",
      chart1: "18 78% 58%",
      chart2: "32 60% 62%",
    },
  },
};

export const propertyManagementSkin: Skin = {
  id: "property_management",
  label: "Property Management",
  description: "Property managers and real estate operations. Approachable terracotta.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "property_management.default",
    campaign: "property_management.default",
    transferDirectory: "property_management.default",
    externalResources: "property_management.default",
    outcomes: "property_management.default",
  },
  copyPresetId: "property_management.default",
  brandHints: {
    recommendedAccent: "32 60% 60%",
    artDirection: "Warm, approachable. Terracotta + tan.",
  },
};
