/**
 * Insurance — corporate blue primary with muted gold accent. Trust, restraint.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "212 64% 36%",
      primaryForeground: "0 0% 100%",
      accent: "42 56% 52%",
      accentForeground: "222 47% 11%",
      ring: "212 64% 36%",
      info: "212 64% 36%",
      chart1: "212 64% 36%",
      chart2: "42 56% 52%",
    },
  },
  dark: {
    colors: {
      primary: "212 72% 60%",
      primaryForeground: "0 0% 100%",
      accent: "42 56% 58%",
      accentForeground: "222 47% 11%",
      ring: "212 72% 60%",
      info: "212 72% 60%",
      chart1: "212 72% 60%",
      chart2: "42 56% 58%",
    },
  },
};

export const insuranceSkin: Skin = {
  id: "insurance",
  label: "Insurance",
  description: "Carriers and brokers. Restrained corporate blue with muted gold.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "insurance.default",
    campaign: "insurance.default",
    transferDirectory: "insurance.default",
    externalResources: "insurance.default",
    outcomes: "insurance.default",
  },
  copyPresetId: "insurance.default",
  brandHints: {
    recommendedAccent: "42 56% 52%",
    artDirection: "Trust + restraint. Corporate blue + muted gold.",
  },
};
