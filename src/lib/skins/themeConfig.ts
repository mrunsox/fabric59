/**
 * Vertical Skin System — Phase 3
 * Workspace / provider override model.
 *
 * Pure functions for parsing, normalizing, and persisting the theme
 * config that lives on `organizations.integration_configs.theme` (and,
 * optionally, on `partners.integration_configs.theme`).
 *
 * No DOM, no React, no network — this module is the contract the hooks
 * and (eventually) the SkinProvider build on top of.
 *
 * JSONB shape (mirrors docs/vertical-skin-architecture.md §5.2):
 *
 * {
 *   "skin_id": "legal",
 *   "overrides": {
 *     "brand_name": "...",
 *     "logo_url": "...",
 *     "tokens": {
 *       "light": { "colors": { "primary": "199 89% 48%" } },
 *       "dark":  { "colors": { ... } }
 *     },
 *     "typography": { "sans": "Inter, system-ui, sans-serif" },
 *     "density": "comfortable"
 *   }
 * }
 */

import { ALL_SKIN_IDS, FALLBACK_SKIN_ID } from "@/lib/skins/themeRegistry";
import { COLOR_TOKEN_KEYS } from "@/lib/theme/tokens";
import { resolveTheme } from "@/lib/theme/themeResolver";
import type {
  ResolvedTheme,
  ThemeColorOverrides,
  ThemeColorTokens,
  ThemeModeOverrides,
  ThemeOverrides,
  SkinId,
} from "@/lib/theme/types";
import type { SkinDensity, SkinTypography } from "@/lib/skins/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandingOverrides {
  brandName?: string;
  logoUrl?: string;
  typography?: SkinTypography;
  density?: SkinDensity;
  tokens?: ThemeModeOverrides;
}

export interface ThemeConfig {
  skinId: SkinId; // already-normalized; never invalid
  branding: BrandingOverrides;
}

/**
 * Subset of fields read from a row. Both `organizations` and `partners`
 * carry the same `integration_configs` JSONB carrier and brand_* scalars
 * (see audit). Accepting an unknown-shaped row keeps this independent
 * from generated Supabase types.
 */
export interface ThemeConfigSource {
  integration_configs?: unknown;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const HSL_TRIPLET_RE = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSkinId(v: unknown): v is SkinId {
  return typeof v === "string" && (ALL_SKIN_IDS as readonly string[]).includes(v);
}

function isHslTriplet(v: unknown): v is string {
  return typeof v === "string" && HSL_TRIPLET_RE.test(v);
}

const TOKEN_KEY_SET = new Set<string>(COLOR_TOKEN_KEYS as string[]);

function normalizeColorOverrides(input: unknown): ThemeColorOverrides | undefined {
  if (!isPlainObject(input)) return undefined;
  const out: ThemeColorOverrides = {};
  for (const [k, v] of Object.entries(input)) {
    if (TOKEN_KEY_SET.has(k) && isHslTriplet(v)) {
      (out as Record<string, string>)[k] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeThemeOverrides(input: unknown): ThemeOverrides | undefined {
  if (!isPlainObject(input)) return undefined;
  const colors = normalizeColorOverrides((input as Record<string, unknown>).colors);
  const out: ThemeOverrides = {};
  if (colors) out.colors = colors;
  // radius intentionally not exposed to JSONB overrides in Phase 3.
  return Object.keys(out).length ? out : undefined;
}

function normalizeModeOverrides(input: unknown): ThemeModeOverrides | undefined {
  if (!isPlainObject(input)) return undefined;
  const light = normalizeThemeOverrides((input as Record<string, unknown>).light);
  const dark = normalizeThemeOverrides((input as Record<string, unknown>).dark);
  const out: ThemeModeOverrides = {};
  if (light) out.light = light;
  if (dark) out.dark = dark;
  return Object.keys(out).length ? out : undefined;
}

function normalizeDensity(v: unknown): SkinDensity | undefined {
  return v === "comfortable" || v === "compact" ? v : undefined;
}

function normalizeTypography(v: unknown): SkinTypography | undefined {
  if (!isPlainObject(v)) return undefined;
  const out: SkinTypography = {};
  if (typeof v.sans === "string" && v.sans.trim()) out.sans = v.sans.trim();
  if (typeof v.mono === "string" && v.mono.trim()) out.mono = v.mono.trim();
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Read the `theme` slice off an `integration_configs` JSONB blob and
 * normalize it. Unknown skin ids → `general`. Malformed branches dropped.
 * Never throws.
 */
export function parseThemeConfig(integrationConfigs: unknown): ThemeConfig {
  if (!isPlainObject(integrationConfigs)) {
    return { skinId: FALLBACK_SKIN_ID, branding: {} };
  }
  const theme = (integrationConfigs as Record<string, unknown>).theme;
  if (!isPlainObject(theme)) {
    return { skinId: FALLBACK_SKIN_ID, branding: {} };
  }

  const rawSkin = (theme as Record<string, unknown>).skin_id;
  const skinId: SkinId = isSkinId(rawSkin) ? rawSkin : FALLBACK_SKIN_ID;

  const overrides = (theme as Record<string, unknown>).overrides;
  const branding: BrandingOverrides = {};
  if (isPlainObject(overrides)) {
    const o = overrides as Record<string, unknown>;
    if (typeof o.brand_name === "string" && o.brand_name.trim()) {
      branding.brandName = o.brand_name.trim();
    }
    if (typeof o.logo_url === "string" && o.logo_url.trim()) {
      branding.logoUrl = o.logo_url.trim();
    }
    const typo = normalizeTypography(o.typography);
    if (typo) branding.typography = typo;
    const density = normalizeDensity(o.density);
    if (density) branding.density = density;
    const tokens = normalizeModeOverrides(o.tokens);
    if (tokens) branding.tokens = tokens;
  }

  return { skinId, branding };
}

/**
 * Merge legacy scalar branding columns into a `ThemeConfig`. Phase 0 rule:
 * legacy scalars are honored ONLY for fields the JSONB layer does not set.
 * Specifically, `brand_primary_color` mirrors into
 * `branding.tokens.{light,dark}.colors.primary` if and only if no
 * JSONB-level primary token override is present in that mode.
 */
export function applyLegacyBrandScalars(
  config: ThemeConfig,
  source: ThemeConfigSource,
): ThemeConfig {
  const next: ThemeConfig = {
    skinId: config.skinId,
    branding: {
      ...config.branding,
      tokens: config.branding.tokens
        ? {
            light: config.branding.tokens.light
              ? {
                  ...config.branding.tokens.light,
                  colors: { ...(config.branding.tokens.light.colors ?? {}) },
                }
              : undefined,
            dark: config.branding.tokens.dark
              ? {
                  ...config.branding.tokens.dark,
                  colors: { ...(config.branding.tokens.dark.colors ?? {}) },
                }
              : undefined,
          }
        : undefined,
    },
  };

  // brand_name / logo_url fall through if JSONB did not set them.
  if (!next.branding.brandName && source.brand_name?.trim()) {
    next.branding.brandName = source.brand_name.trim();
  }
  if (!next.branding.logoUrl && source.brand_logo_url?.trim()) {
    next.branding.logoUrl = source.brand_logo_url.trim();
  }

  // brand_primary_color mirrors only into modes that lack a JSONB primary.
  const legacyPrimary = source.brand_primary_color?.trim();
  if (legacyPrimary && isHslTriplet(legacyPrimary)) {
    next.branding.tokens = next.branding.tokens ?? {};
    for (const mode of ["light", "dark"] as const) {
      const existing = next.branding.tokens[mode]?.colors?.primary;
      if (!existing) {
        next.branding.tokens[mode] = next.branding.tokens[mode] ?? {};
        next.branding.tokens[mode]!.colors = {
          ...(next.branding.tokens[mode]!.colors ?? {}),
          primary: legacyPrimary,
        };
      }
    }
  }

  // Drop empty `tokens` to keep equality assertions clean.
  if (next.branding.tokens && !next.branding.tokens.light && !next.branding.tokens.dark) {
    delete next.branding.tokens;
  }
  return next;
}

/**
 * Read + legacy-merge in one step. Convenience for the hooks.
 */
export function readThemeConfig(source: ThemeConfigSource | null | undefined): ThemeConfig {
  if (!source) return { skinId: FALLBACK_SKIN_ID, branding: {} };
  const parsed = parseThemeConfig(source.integration_configs);
  return applyLegacyBrandScalars(parsed, source);
}

// ---------------------------------------------------------------------------
// Serialization (writes)
// ---------------------------------------------------------------------------

/**
 * Build the new `integration_configs` JSONB to persist, preserving every
 * non-`theme` key already on the carrier. Pass the existing JSONB in so
 * unrelated config slices (e.g. CRM, Slack) are never clobbered.
 */
export function serializeThemeConfig(
  existing: unknown,
  config: ThemeConfig,
): Record<string, unknown> {
  const base = isPlainObject(existing) ? { ...existing } : {};
  const themeJson: Record<string, unknown> = { skin_id: config.skinId };
  const o: Record<string, unknown> = {};
  if (config.branding.brandName) o.brand_name = config.branding.brandName;
  if (config.branding.logoUrl) o.logo_url = config.branding.logoUrl;
  if (config.branding.typography) o.typography = config.branding.typography;
  if (config.branding.density) o.density = config.branding.density;
  if (config.branding.tokens) o.tokens = config.branding.tokens;
  if (Object.keys(o).length) themeJson.overrides = o;
  base.theme = themeJson;
  return base;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface ResolveThemeForOrgInput {
  organization?: ThemeConfigSource | null;
  partner?: ThemeConfigSource | null;
}

/**
 * Final resolved theme for an org (+ optional partner). Skin id comes
 * from the organization carrier. Precedence:
 *
 *   BASE_THEME ← skin ← partner overrides ← organization overrides
 *
 * Pure and deterministic.
 */
export function resolveOrganizationTheme(
  input: ResolveThemeForOrgInput,
): ResolvedTheme {
  const org = readThemeConfig(input.organization ?? null);
  const partner = readThemeConfig(input.partner ?? null);
  return resolveTheme({
    skinId: org.skinId,
    partnerOverrides: partner.branding.tokens,
    organizationOverrides: org.branding.tokens,
  });
}

// Re-exports for hook consumers.
export { FALLBACK_SKIN_ID, ALL_SKIN_IDS };
export type { SkinId, ResolvedTheme, ThemeColorTokens };
