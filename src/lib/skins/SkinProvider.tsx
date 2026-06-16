/**
 * Vertical Skin System — Phase 4
 * Runtime providers.
 *
 *  - <SkinProvider>: mounted inside the authenticated app shell. Consumes
 *    `useResolvedSkin()` and injects CSS variables onto <html>, plus
 *    `data-skin` / `data-density` markers.
 *
 *  - <EmbedSkinProvider>: mounted on /embed/... routes. Accepts a
 *    pre-resolved theme (built from the embed payload's branding sources)
 *    so the chromeless runner inherits the org's skin without any
 *    privileged client-side reads.
 *
 *  - <ResolvedThemeContext>: exposes the resolved theme/skin id/density
 *    to descendants that need it (admin previews, skin pickers).
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { applyCssVars, removeCssVars, toCssVars } from "@/lib/theme/cssVars";
import { FALLBACK_SKIN_ID, getSkin } from "@/lib/skins/themeRegistry";
import { resolveOrganizationTheme } from "@/lib/skins/themeConfig";
import { useResolvedSkin } from "@/hooks/useOrganizationThemeConfig";
import type { ResolvedTheme, ThemeMode } from "@/lib/theme/types";
import type { SkinDensity } from "@/lib/skins/types";
import type { ThemeConfigSource } from "@/lib/skins/themeConfig";

interface SkinContextValue {
  theme: ResolvedTheme;
  mode: ThemeMode;
  density: SkinDensity;
}

const SkinContext = createContext<SkinContextValue | null>(null);

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (ctx) return ctx;
  // Safe fallback for surfaces that render outside a provider (tests, marketing).
  const skin = getSkin(FALLBACK_SKIN_ID);
  return {
    theme: { skinId: skin.id, tokens: skin.tokens },
    mode: "light",
    density: skin.density ?? "comfortable",
  };
}

function detectMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Apply a resolved theme to the document root. Returns a cleanup that
 * removes the applied vars + data attributes so unmount restores defaults.
 */
function applyThemeToDocument(
  theme: ResolvedTheme,
  density: SkinDensity,
  mode: ThemeMode,
): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const vars = toCssVars(theme.tokens[mode]);
  const applied = applyCssVars(vars, root);
  const prevSkin = root.getAttribute("data-skin");
  const prevDensity = root.getAttribute("data-density");
  root.setAttribute("data-skin", theme.skinId);
  root.setAttribute("data-density", density);
  return () => {
    removeCssVars(applied, root);
    if (prevSkin) root.setAttribute("data-skin", prevSkin);
    else root.removeAttribute("data-skin");
    if (prevDensity) root.setAttribute("data-density", prevDensity);
    else root.removeAttribute("data-density");
  };
}

interface ProviderProps {
  children: ReactNode;
  /** Optional mode override; defaults to detecting the `.dark` class. */
  mode?: ThemeMode;
}

/**
 * Authenticated app provider. Wraps the route tree, resolves the active
 * organization's skin via Phase 3 hooks, and writes CSS variables.
 */
export function SkinProvider({ children, mode: modeOverride }: ProviderProps) {
  const { theme } = useResolvedSkin();
  const skinMeta = useMemo(() => getSkin(theme.skinId), [theme.skinId]);
  const density: SkinDensity = skinMeta.density ?? "comfortable";
  const mode: ThemeMode = modeOverride ?? detectMode();

  useEffect(() => {
    return applyThemeToDocument(theme, density, mode);
  }, [theme, density, mode]);

  const value = useMemo<SkinContextValue>(
    () => ({ theme, mode, density }),
    [theme, mode, density],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

interface EmbedProviderProps {
  children: ReactNode;
  /** Optional org/partner branding sources fetched server-side via the embed
   *  resolver. The provider re-runs the Phase 3 resolver client-side so
   *  the precedence contract is identical to the authenticated app. */
  organization?: ThemeConfigSource | null;
  partner?: ThemeConfigSource | null;
  /** Optional pre-resolved theme. Wins over sources if both passed. */
  theme?: ResolvedTheme;
  mode?: ThemeMode;
}

/**
 * Embed-runtime provider. Mounted outside the authenticated app shell;
 * does not read from Supabase directly.
 */
export function EmbedSkinProvider({
  children,
  organization,
  partner,
  theme: themeProp,
  mode: modeOverride,
}: EmbedProviderProps) {
  const theme = useMemo<ResolvedTheme>(
    () =>
      themeProp ??
      resolveOrganizationTheme({ organization, partner }),
    [themeProp, organization, partner],
  );
  const skinMeta = useMemo(() => getSkin(theme.skinId), [theme.skinId]);
  const density: SkinDensity = skinMeta.density ?? "comfortable";
  const mode: ThemeMode = modeOverride ?? detectMode();

  useEffect(() => {
    return applyThemeToDocument(theme, density, mode);
  }, [theme, density, mode]);

  const value = useMemo<SkinContextValue>(
    () => ({ theme, mode, density }),
    [theme, mode, density],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}
