/**
 * Vertical Skin System — Phase 1
 * Deterministic theme resolver.
 *
 * Precedence (lowest → highest):
 *   BASE_THEME  ←  skin tokens  ←  partner overrides  ←  organization overrides
 *
 * The resolver is pure: identical inputs always produce identical outputs.
 * It does not mount providers or touch the DOM — Phase 4 will add the
 * runtime injection layer on top of this contract.
 */

import { BASE_THEME } from "./baseTheme";
import { getSkin, FALLBACK_SKIN_ID } from "@/lib/skins/themeRegistry";
import type {
  ResolveThemeInput,
  ResolvedTheme,
  ThemeMode,
  ThemeModeOverrides,
  ThemeModeTokens,
  ThemeOverrides,
  ThemeTokens,
} from "./types";

function mergeTokens(base: ThemeTokens, override?: ThemeOverrides): ThemeTokens {
  if (!override) return base;
  return {
    colors: { ...base.colors, ...(override.colors ?? {}) },
    radius: { ...base.radius, ...(override.radius ?? {}) },
  };
}

function mergeModeTokens(
  base: ThemeModeTokens,
  override?: ThemeModeOverrides,
): ThemeModeTokens {
  return {
    light: mergeTokens(base.light, override?.light),
    dark: mergeTokens(base.dark, override?.dark),
  };
}

/**
 * Resolve the effective theme for an org/partner/skin combination.
 * Phase 1 contract — does not apply tokens to the DOM.
 */
export function resolveTheme(input: ResolveThemeInput = {}): ResolvedTheme {
  const skin = getSkin(input.skinId);

  // base ← skin
  const baseMerged = mergeModeTokens(BASE_THEME, {
    light: { colors: skin.tokens.light.colors, radius: skin.tokens.light.radius },
    dark: { colors: skin.tokens.dark.colors, radius: skin.tokens.dark.radius },
  });

  // ← partner overrides
  const partnerMerged = mergeModeTokens(baseMerged, input.partnerOverrides);

  // ← organization overrides
  const finalTokens = mergeModeTokens(partnerMerged, input.organizationOverrides);

  return {
    skinId: skin.id,
    tokens: finalTokens,
  };
}

export function resolveThemeForMode(
  input: ResolveThemeInput,
  mode: ThemeMode,
): ThemeTokens {
  return resolveTheme(input).tokens[mode];
}

export { FALLBACK_SKIN_ID };
