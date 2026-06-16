/**
 * Vertical Skin System — Phase 1
 * Typed token model for Fabric59 themes.
 *
 * Tokens are stored as HSL triplet strings (e.g. "199 89% 48%") so they
 * can be injected directly into CSS custom properties consumed by
 * Tailwind/shadcn via `hsl(var(--token))`.
 */

export type HslTriplet = string;

/**
 * Semantic color tokens. Names mirror the existing CSS variables in
 * src/index.css to guarantee parity with the current design system.
 */
export interface ThemeColorTokens {
  background: HslTriplet;
  foreground: HslTriplet;

  card: HslTriplet;
  cardForeground: HslTriplet;

  popover: HslTriplet;
  popoverForeground: HslTriplet;

  primary: HslTriplet;
  primaryForeground: HslTriplet;

  secondary: HslTriplet;
  secondaryForeground: HslTriplet;

  muted: HslTriplet;
  mutedForeground: HslTriplet;

  accent: HslTriplet;
  accentForeground: HslTriplet;

  destructive: HslTriplet;
  destructiveForeground: HslTriplet;

  border: HslTriplet;
  input: HslTriplet;
  ring: HslTriplet;

  // Status
  success: HslTriplet;
  successForeground: HslTriplet;
  warning: HslTriplet;
  warningForeground: HslTriplet;
  info: HslTriplet;
  infoForeground: HslTriplet;

  // Extended status
  syncing: HslTriplet;
  pendingReview: HslTriplet;
  disconnected: HslTriplet;

  // Sidebar
  sidebarBackground: HslTriplet;
  sidebarForeground: HslTriplet;
  sidebarPrimary: HslTriplet;
  sidebarPrimaryForeground: HslTriplet;
  sidebarAccent: HslTriplet;
  sidebarAccentForeground: HslTriplet;
  sidebarBorder: HslTriplet;
  sidebarRing: HslTriplet;

  // Charts
  chart1: HslTriplet;
  chart2: HslTriplet;
  chart3: HslTriplet;
  chart4: HslTriplet;
  chart5: HslTriplet;

  // Script builder nodes
  nodeStart: HslTriplet;
  nodeQuestion: HslTriplet;
  nodeAction: HslTriplet;
  nodeCondition: HslTriplet;
  nodeEnd: HslTriplet;
  nodeContent: HslTriplet;
  nodeData: HslTriplet;
  nodeLogic: HslTriplet;
  nodeIntegration: HslTriplet;
  nodeCall: HslTriplet;
  nodeAi: HslTriplet;
  nodeFlow: HslTriplet;
}

export interface ThemeRadiusTokens {
  base: string;
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  radius: ThemeRadiusTokens;
}

/**
 * A mode-aware token set. Both `light` and `dark` are required so the
 * resolver always produces a deterministic output for either mode.
 */
export interface ThemeModeTokens {
  light: ThemeTokens;
  dark: ThemeTokens;
}

export type ThemeMode = "light" | "dark";

/**
 * Partial overrides allowed at the partner/org override layers. Only
 * semantic token names are accepted — raw color names are not part of
 * the public API.
 */
export type ThemeColorOverrides = Partial<ThemeColorTokens>;

export interface ThemeOverrides {
  colors?: ThemeColorOverrides;
  radius?: Partial<ThemeRadiusTokens>;
}

export interface ThemeModeOverrides {
  light?: ThemeOverrides;
  dark?: ThemeOverrides;
}

/**
 * A Skin is a named, mode-aware token bundle. Phase 2 will populate the
 * registry with the 10 canonical vertical skins. Phase 1 only ships the
 * `general` fallback, which is bit-for-bit equivalent to the base theme.
 */
export type SkinId =
  | "legal"
  | "medical"
  | "financial"
  | "property_management"
  | "professional_services"
  | "home_services"
  | "ecommerce"
  | "general"
  | "insurance"
  | "education";

export interface Skin {
  id: SkinId;
  label: string;
  tokens: ThemeModeTokens;
}

/**
 * Resolution inputs. Precedence (lowest → highest):
 *   base  ←  skin  ←  partner overrides  ←  organization overrides
 */
export interface ResolveThemeInput {
  skinId?: SkinId;
  partnerOverrides?: ThemeModeOverrides;
  organizationOverrides?: ThemeModeOverrides;
}

export interface ResolvedTheme {
  skinId: SkinId;
  tokens: ThemeModeTokens;
}
