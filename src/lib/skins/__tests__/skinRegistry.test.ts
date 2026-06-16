import { describe, it, expect } from "vitest";
import {
  ALL_SKIN_IDS,
  FALLBACK_SKIN_ID,
  getSkin,
  listSkins,
} from "@/lib/skins/themeRegistry";
import { BASE_THEME } from "@/lib/theme/baseTheme";
import { COLOR_TOKEN_KEYS } from "@/lib/theme/tokens";
import { resolveTheme } from "@/lib/theme/themeResolver";
import type { ThemeColorTokens, ThemeMode } from "@/lib/theme/types";
import type { SkinId } from "@/lib/skins/types";

const CANONICAL_IDS: SkinId[] = [
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
];

function parseHslTriplet(v: string): { h: number; s: number; l: number } | null {
  const m = v.match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
}

describe("skin registry — completeness", () => {
  it("registers exactly the 10 canonical ids", () => {
    expect(new Set(ALL_SKIN_IDS)).toEqual(new Set(CANONICAL_IDS));
    expect(ALL_SKIN_IDS.length).toBe(10);
    expect(listSkins().length).toBe(10);
  });

  it("listSkins returns packs in the declared stable order", () => {
    expect(listSkins().map((s) => s.id)).toEqual([...ALL_SKIN_IDS]);
  });

  it("FALLBACK_SKIN_ID is general", () => {
    expect(FALLBACK_SKIN_ID).toBe("general");
  });
});

describe("skin registry — metadata shape", () => {
  for (const id of CANONICAL_IDS) {
    it(`${id} carries required metadata`, () => {
      const skin = getSkin(id);
      expect(skin.id).toBe(id);
      expect(typeof skin.label).toBe("string");
      expect(skin.label.length).toBeGreaterThan(0);
      expect(skin.starterPacks).toBeTypeOf("object");
      expect(typeof skin.copyPresetId).toBe("string");
      expect(skin.overrides).toBeTypeOf("object");
    });
  }

  it("general is exact BASE_THEME parity with no overrides", () => {
    const g = getSkin("general");
    expect(g.overrides).toEqual({});
    expect(g.tokens).toEqual(BASE_THEME);
  });
});

describe("skin registry — token completeness per skin", () => {
  for (const id of CANONICAL_IDS) {
    it(`${id} defines every color token in both modes`, () => {
      const skin = getSkin(id);
      for (const key of COLOR_TOKEN_KEYS) {
        expect(skin.tokens.light.colors[key as keyof ThemeColorTokens]).toBeTruthy();
        expect(skin.tokens.dark.colors[key as keyof ThemeColorTokens]).toBeTruthy();
      }
      expect(skin.tokens.light.radius.base).toBeTruthy();
      expect(skin.tokens.dark.radius.base).toBeTruthy();
    });
  }
});

describe("skin registry — differentiation", () => {
  it("at least 8 non-general skins differ from BASE_THEME primary (light)", () => {
    const basePrimary = BASE_THEME.light.colors.primary;
    const differing = CANONICAL_IDS.filter((id) => id !== "general").filter(
      (id) => getSkin(id).tokens.light.colors.primary !== basePrimary,
    );
    expect(differing.length).toBeGreaterThanOrEqual(8);
  });
});

describe("skin resolver — determinism + fallback", () => {
  for (const id of CANONICAL_IDS) {
    it(`${id} resolves deterministically`, () => {
      const a = resolveTheme({ skinId: id });
      const b = resolveTheme({ skinId: id });
      expect(a).toEqual(b);
      expect(a.skinId).toBe(id);
    });
  }

  it("missing / null / invalid skin id falls back to general", () => {
    expect(getSkin(null).id).toBe("general");
    expect(getSkin(undefined).id).toBe("general");
    // @ts-expect-error — runtime fallback for invalid id
    expect(getSkin("not_a_skin").id).toBe("general");
    // @ts-expect-error — resolver fallback
    expect(resolveTheme({ skinId: "not_a_skin" }).skinId).toBe("general");
  });
});

describe("skin resolver — override merge precedence (regression)", () => {
  it("org > partner > skin > base, on a non-general skin", () => {
    const r = resolveTheme({
      skinId: "legal",
      partnerOverrides: {
        light: { colors: { primary: "10 10% 10%", accent: "20 20% 20%" } },
      },
      organizationOverrides: {
        light: { colors: { primary: "99 99% 99%" } },
      },
    });
    // org wins
    expect(r.tokens.light.colors.primary).toBe("99 99% 99%");
    // partner wins over skin/base
    expect(r.tokens.light.colors.accent).toBe("20 20% 20%");
    // un-overridden token still reflects legal skin (not base)
    const legal = getSkin("legal");
    expect(r.tokens.light.colors.ring).toBe(legal.tokens.light.colors.ring);
    // dark untouched when only light overrides supplied
    expect(r.tokens.dark).toEqual(legal.tokens.dark);
  });
});

describe("skin registry — contrast sanity (lightweight)", () => {
  const PAIRS: Array<[keyof ThemeColorTokens, keyof ThemeColorTokens]> = [
    ["background", "foreground"],
    ["primary", "primaryForeground"],
    ["card", "cardForeground"],
    ["destructive", "destructiveForeground"],
  ];
  const MODES: ThemeMode[] = ["light", "dark"];

  for (const id of CANONICAL_IDS) {
    for (const mode of MODES) {
      for (const [bg, fg] of PAIRS) {
        it(`${id} (${mode}) — ${bg} vs ${fg} are present and distinct in lightness`, () => {
          const t = getSkin(id).tokens[mode].colors;
          const a = parseHslTriplet(t[bg]);
          const b = parseHslTriplet(t[fg]);
          expect(a, `invalid HSL for ${bg}`).not.toBeNull();
          expect(b, `invalid HSL for ${fg}`).not.toBeNull();
          // Guard against pack mistakes that would render text invisible.
          // Not a full WCAG check — just catch obvious breakage.
          expect(t[bg]).not.toBe(t[fg]);
          if (a && b) {
            expect(Math.abs(a.l - b.l)).toBeGreaterThanOrEqual(25);
          }
        });
      }
    }
  }
});
