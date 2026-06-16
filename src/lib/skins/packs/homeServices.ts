/**
 * Home Services — safety blue primary with high-vis orange accent. Field-ops energy.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "212 84% 42%",
      primaryForeground: "0 0% 100%",
      accent: "22 92% 52%",
      accentForeground: "0 0% 100%",
      ring: "212 84% 42%",
      info: "212 84% 42%",
      chart1: "212 84% 42%",
      chart2: "22 92% 52%",
    },
  },
  dark: {
    colors: {
      primary: "212 88% 58%",
      primaryForeground: "0 0% 100%",
      accent: "22 92% 58%",
      accentForeground: "0 0% 100%",
      ring: "212 88% 58%",
      info: "212 88% 58%",
      chart1: "212 88% 58%",
      chart2: "22 92% 58%",
    },
  },
};

export const homeServicesSkin: Skin = {
  id: "home_services",
  label: "Home Services",
  description: "HVAC, plumbing, contractors, dispatch ops. Safety blue + high-vis.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "home_services.default",
    campaign: "home_services.default",
    transferDirectory: "home_services.default",
    externalResources: "home_services.default",
    outcomes: "home_services.default",
  },
  copyPresetId: "home_services.default",
  brandHints: {
    recommendedAccent: "22 92% 52%",
    artDirection: "Field-ops energy. Safety blue + hi-vis orange.",
  },
};
