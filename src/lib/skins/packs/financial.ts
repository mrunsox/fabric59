/**
 * Financial — forest green primary with gold accent. Stability and wealth.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "152 64% 28%",
      primaryForeground: "0 0% 100%",
      accent: "42 78% 50%",
      accentForeground: "222 47% 11%",
      ring: "152 64% 28%",
      info: "152 64% 28%",
      chart1: "152 64% 28%",
      chart2: "42 78% 50%",
    },
  },
  dark: {
    colors: {
      primary: "152 58% 50%",
      primaryForeground: "152 80% 8%",
      accent: "42 78% 58%",
      accentForeground: "222 47% 11%",
      ring: "152 58% 50%",
      info: "152 58% 50%",
      chart1: "152 58% 50%",
      chart2: "42 78% 58%",
    },
  },
};

export const financialSkin: Skin = {
  id: "financial",
  label: "Financial",
  description: "Financial services, wealth, and banking. Forest green with gold.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "financial.default",
    campaign: "financial.default",
    transferDirectory: "financial.default",
    externalResources: "financial.default",
    outcomes: "financial.default",
  },
  copyPresetId: "financial.default",
  brandHints: {
    recommendedAccent: "42 78% 50%",
    artDirection: "Stability, wealth. Forest + gold. Reserved typography.",
  },
};
