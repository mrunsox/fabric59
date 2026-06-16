import { describe, it, expect } from "vitest";
import { BASE_THEME } from "../baseTheme";
import { COLOR_TOKEN_KEYS, CSS_VAR_MAP } from "../tokens";
import { resolveTheme, resolveThemeForMode } from "../themeResolver";
import {
  ALL_SKIN_IDS,
  FALLBACK_SKIN_ID,
  getSkin,
  listSkins,
} from "@/lib/skins/themeRegistry";
import type { ThemeColorTokens } from "../types";

describe("theme tokens — completeness", () => {
  it("COLOR_TOKEN_KEYS and CSS_VAR_MAP have identical key sets", () => {
    const mapKeys = Object.keys(CSS_VAR_MAP).sort();
    const listKeys = [...COLOR_TOKEN_KEYS].sort();
    expect(listKeys).toEqual(mapKeys);
  });

  it("every token key maps to a non-empty CSS variable name", () => {
    for (const key of COLOR_TOKEN_KEYS) {
      const v = CSS_VAR_MAP[key];
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
      expect(v.startsWith("--")).toBe(false);
    }
  });
});

describe("baseTheme — completeness", () => {
  it("light and dark define every color token", () => {
    for (const key of COLOR_TOKEN_KEYS) {
      expect(BASE_THEME.light.colors[key as keyof ThemeColorTokens]).toBeTruthy();
      expect(BASE_THEME.dark.colors[key as keyof ThemeColorTokens]).toBeTruthy();
    }
  });

  it("radius defined for both modes", () => {
    expect(BASE_THEME.light.radius.base).toBe("0.5rem");
    expect(BASE_THEME.dark.radius.base).toBe("0.5rem");
  });

  it("parity with current src/index.css semantic catalog (spot checks)", () => {
    expect(BASE_THEME.light.colors.background).toBe("0 0% 100%");
    expect(BASE_THEME.light.colors.primary).toBe("199 89% 48%");
    expect(BASE_THEME.light.colors.accent).toBe("172 66% 50%");
    expect(BASE_THEME.dark.colors.background).toBe("222 47% 5%");
    expect(BASE_THEME.dark.colors.muted).toBe("217 33% 14%");
    expect(BASE_THEME.dark.colors.sidebarBackground).toBe("222 47% 4%");
  });
});

describe("skin registry — fallback", () => {
  it("exposes all 10 canonical skin ids", () => {
    expect(new Set(ALL_SKIN_IDS)).toEqual(
      new Set([
        "legal",
        "medical",
        "financial",
        "property_management",
        "professional_services",
        "home_services",
        "ecommerce",
        "general",
        "insurance",
        "education",
      ]),
    );
    expect(listSkins().length).toBe(10);
  });

  it("falls back to `general` for unknown or missing skin ids", () => {
    expect(getSkin().id).toBe(FALLBACK_SKIN_ID);
    expect(getSkin(null).id).toBe(FALLBACK_SKIN_ID);
    // @ts-expect-error — testing runtime fallback for invalid id
    expect(getSkin("does_not_exist").id).toBe(FALLBACK_SKIN_ID);
  });
});

describe("resolveTheme — deterministic + precedence", () => {
  it("returns BASE_THEME tokens with no inputs", () => {
    const r = resolveTheme();
    expect(r.skinId).toBe(FALLBACK_SKIN_ID);
    expect(r.tokens).toEqual(BASE_THEME);
  });

  it("is deterministic for identical inputs", () => {
    const a = resolveTheme({ skinId: "legal" });
    const b = resolveTheme({ skinId: "legal" });
    expect(a).toEqual(b);
  });

  it("applies precedence: base ← skin ← partner ← org", () => {
    const r = resolveTheme({
      skinId: "general",
      partnerOverrides: {
        light: { colors: { primary: "10 10% 10%", accent: "20 20% 20%" } },
      },
      organizationOverrides: {
        light: { colors: { primary: "99 99% 99%" } },
      },
    });
    expect(r.tokens.light.colors.primary).toBe("99 99% 99%"); // org wins
    expect(r.tokens.light.colors.accent).toBe("20 20% 20%"); // partner wins over base
    expect(r.tokens.light.colors.background).toBe(
      BASE_THEME.light.colors.background,
    ); // base preserved
    // dark unchanged when only light overrides supplied
    expect(r.tokens.dark).toEqual(BASE_THEME.dark);
  });

  it("resolveThemeForMode returns a single-mode token set", () => {
    const light = resolveThemeForMode({}, "light");
    const dark = resolveThemeForMode({}, "dark");
    expect(light).toEqual(BASE_THEME.light);
    expect(dark).toEqual(BASE_THEME.dark);
  });
});
