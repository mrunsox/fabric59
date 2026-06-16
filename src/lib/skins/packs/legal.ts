/**
 * Legal — deep navy/indigo primary with warm gold accents. Conveys trust and formality.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "222 60% 28%",
      primaryForeground: "0 0% 100%",
      accent: "42 78% 52%",
      accentForeground: "222 47% 11%",
      ring: "222 60% 28%",
      info: "222 60% 28%",
      chart1: "222 60% 28%",
      chart2: "42 78% 52%",
    },
  },
  dark: {
    colors: {
      primary: "222 65% 60%",
      primaryForeground: "0 0% 100%",
      accent: "42 78% 58%",
      accentForeground: "222 47% 11%",
      ring: "222 65% 60%",
      info: "222 65% 60%",
      chart1: "222 65% 60%",
      chart2: "42 78% 58%",
    },
  },
};

export const legalSkin: Skin = {
  id: "legal",
  label: "Legal",
  description: "Law firms and legal services. Trust-forward navy with gold accents.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "legal.default",
    campaign: "legal.default",
    transferDirectory: "legal.default",
    externalResources: "legal.default",
    outcomes: "legal.default",
  },
  copyPresetId: "legal.default",
  brandHints: {
    recommendedAccent: "42 78% 52%",
    artDirection: "Formal, trust-forward. Navy + gold. Serif display optional.",
  },
};
