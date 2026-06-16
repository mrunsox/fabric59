/**
 * Vertical Skin System — Phase 2
 * Pack-building helpers.
 *
 * Each pack declares a semantic `ThemeModeOverrides` diff over BASE_THEME.
 * `buildSkinTokens` materialises that diff into a fully-populated
 * `ThemeModeTokens` so the resolver never has to merge at runtime.
 */

import { BASE_THEME } from "@/lib/theme/baseTheme";
import type {
  ThemeModeOverrides,
  ThemeModeTokens,
  ThemeOverrides,
  ThemeTokens,
} from "@/lib/theme/types";

function applyOverrides(base: ThemeTokens, override?: ThemeOverrides): ThemeTokens {
  if (!override) return base;
  return {
    colors: { ...base.colors, ...(override.colors ?? {}) },
    radius: { ...base.radius, ...(override.radius ?? {}) },
  };
}

export function buildSkinTokens(overrides: ThemeModeOverrides): ThemeModeTokens {
  return {
    light: applyOverrides(BASE_THEME.light, overrides.light),
    dark: applyOverrides(BASE_THEME.dark, overrides.dark),
  };
}
