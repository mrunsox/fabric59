/**
 * Professional Services — slate blue primary with sand accent. Neutral, premium.
 */
import { buildSkinTokens } from "./_buildPack";
import type { Skin } from "@/lib/skins/types";
import type { ThemeModeOverrides } from "@/lib/theme/types";

const overrides: ThemeModeOverrides = {
  light: {
    colors: {
      primary: "215 32% 38%",
      primaryForeground: "0 0% 100%",
      accent: "36 32% 64%",
      accentForeground: "222 47% 11%",
      ring: "215 32% 38%",
      info: "215 32% 38%",
      chart1: "215 32% 38%",
      chart2: "36 32% 64%",
    },
  },
  dark: {
    colors: {
      primary: "215 42% 62%",
      primaryForeground: "0 0% 100%",
      accent: "36 32% 68%",
      accentForeground: "222 47% 11%",
      ring: "215 42% 62%",
      info: "215 42% 62%",
      chart1: "215 42% 62%",
      chart2: "36 32% 68%",
    },
  },
};

export const professionalServicesSkin: Skin = {
  id: "professional_services",
  label: "Professional Services",
  description: "Consulting, accounting, advisory. Neutral premium slate.",
  overrides,
  tokens: buildSkinTokens(overrides),
  density: "comfortable",
  starterPacks: {
    guide: "professional_services.default",
    campaign: "professional_services.default",
    transferDirectory: "professional_services.default",
    externalResources: "professional_services.default",
    outcomes: "professional_services.default",
  },
  copyPresetId: "professional_services.default",
  brandHints: {
    recommendedAccent: "36 32% 64%",
    artDirection: "Restrained, premium. Slate + sand.",
  },
};
