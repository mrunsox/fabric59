/**
 * Ecommerce — magenta primary with violet accent. Retail vibrancy. Compact density.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "330 78% 48%",
      primaryForeground: "0 0% 100%",
      accent: "270 72% 58%",
      accentForeground: "0 0% 100%",
      ring: "330 78% 48%",
      info: "330 78% 48%",
      chart1: "330 78% 48%",
      chart2: "270 72% 58%",
    },
  },
  dark: {
    colors: {
      primary: "330 82% 62%",
      primaryForeground: "0 0% 100%",
      accent: "270 76% 68%",
      accentForeground: "0 0% 100%",
      ring: "330 82% 62%",
      info: "330 82% 62%",
      chart1: "330 82% 62%",
      chart2: "270 76% 68%",
    },
  },
};

export const ecommerceSkin: Skin = {
  id: "ecommerce",
  label: "Ecommerce",
  description: "Retail and DTC. Vibrant magenta + violet. Dense layouts.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "compact",
  starterPacks: {
    guide: "ecommerce.default",
    campaign: "ecommerce.default",
    transferDirectory: "ecommerce.default",
    externalResources: "ecommerce.default",
    outcomes: "ecommerce.default",
  },
  copyPresetId: "ecommerce.default",
  brandHints: {
    recommendedAccent: "270 72% 58%",
    artDirection: "Retail vibrancy. Magenta + violet. Denser UI.",
  },
};
