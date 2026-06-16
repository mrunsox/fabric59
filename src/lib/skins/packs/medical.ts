/**
 * Medical — clinical teal primary with soft green accent. Calm, clinical.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "184 72% 36%",
      primaryForeground: "0 0% 100%",
      accent: "152 56% 48%",
      accentForeground: "0 0% 100%",
      ring: "184 72% 36%",
      info: "184 72% 36%",
      chart1: "184 72% 36%",
      chart2: "152 56% 48%",
    },
  },
  dark: {
    colors: {
      primary: "184 68% 52%",
      primaryForeground: "0 0% 100%",
      accent: "152 56% 55%",
      accentForeground: "222 47% 11%",
      ring: "184 68% 52%",
      info: "184 68% 52%",
      chart1: "184 68% 52%",
      chart2: "152 56% 55%",
    },
  },
};

export const medicalSkin: Skin = {
  id: "medical",
  label: "Medical",
  description: "Healthcare, clinics, and patient services. Clinical teal with calm green.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "medical.default",
    campaign: "medical.default",
    transferDirectory: "medical.default",
    externalResources: "medical.default",
    outcomes: "medical.default",
  },
  copyPresetId: "medical.default",
  brandHints: {
    recommendedAccent: "152 56% 48%",
    artDirection: "Calm clinical. Teal + soft green. High legibility.",
  },
};
