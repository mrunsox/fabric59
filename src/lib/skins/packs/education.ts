/**
 * Education — scholastic purple primary with mustard accent. Friendly, academic.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "262 60% 46%",
      primaryForeground: "0 0% 100%",
      accent: "44 84% 54%",
      accentForeground: "222 47% 11%",
      ring: "262 60% 46%",
      info: "262 60% 46%",
      chart1: "262 60% 46%",
      chart2: "44 84% 54%",
    },
  },
  dark: {
    colors: {
      primary: "262 70% 66%",
      primaryForeground: "0 0% 100%",
      accent: "44 84% 60%",
      accentForeground: "222 47% 11%",
      ring: "262 70% 66%",
      info: "262 70% 66%",
      chart1: "262 70% 66%",
      chart2: "44 84% 60%",
    },
  },
};

export const educationSkin: Skin = {
  id: "education",
  label: "Education",
  description: "Schools, edtech, training. Friendly scholastic purple with mustard.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "education.default",
    campaign: "education.default",
    transferDirectory: "education.default",
    externalResources: "education.default",
    outcomes: "education.default",
  },
  copyPresetId: "education.default",
  brandHints: {
    recommendedAccent: "44 84% 54%",
    artDirection: "Friendly, academic. Purple + mustard.",
  },
};
