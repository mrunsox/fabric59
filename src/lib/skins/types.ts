/**
 * Vertical Skin System — Phase 2
 * Skin metadata extensions.
 *
 * SkinId itself is canonical in `@/lib/theme/types` (Phase 1). This module
 * re-exports it and adds the metadata fields described in
 * docs/vertical-skin-architecture.md §4.1 so packs can carry starter-pack
 * bindings, typography, density, and brand hints without bloating the
 * core theme contract.
 */

import type {
  SkinId,
  ThemeModeOverrides,
  ThemeModeTokens,
} from "@/lib/theme/types";

export type { SkinId } from "@/lib/theme/types";

export interface StarterPackBindings {
  guide?: string;
  campaign?: string;
  transferDirectory?: string;
  externalResources?: string;
  outcomes?: string;
}

export interface SkinTypography {
  sans?: string;
  mono?: string;
}

export type SkinDensity = "comfortable" | "compact";

export interface SkinBrandHints {
  recommendedAccent?: string;
  suggestedLogo?: string;
  artDirection?: string;
}

/**
 * Phase 2 Skin shape — extends the Phase 1 contract additively.
 * `tokens` is the fully-materialised mode-aware token set (BASE_THEME
 * with `overrides` applied) so resolver consumption stays O(1) and
 * deterministic. `overrides` is preserved for tests, admin previews,
 * and future override-diff UIs.
 */
export interface Skin {
  id: SkinId;
  label: string;
  description?: string;
  tokens: ThemeModeTokens;
  overrides: ThemeModeOverrides;
  typography?: SkinTypography;
  density?: SkinDensity;
  starterPacks: StarterPackBindings;
  copyPresetId?: string;
  brandHints?: SkinBrandHints;
}
