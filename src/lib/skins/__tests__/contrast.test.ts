/**
 * Vertical Skin System — Phase 7
 * WCAG-grade contrast checks for every canonical skin in both modes.
 *
 * This is intentionally stricter than the lightweight lightness-delta check
 * in `skinRegistry.test.ts`. It computes the WCAG 2.1 relative luminance and
 * enforces a minimum contrast ratio for the four highest-stakes token pairs.
 *
 * Thresholds:
 *   - background / foreground         ≥ 4.5  (WCAG AA body text)
 *   - card       / cardForeground     ≥ 4.5
 *   - primary    / primaryForeground  ≥ 3.0  (AA large / UI component text)
 *   - destructive/ destructiveForeground ≥ 3.0
 */
import { describe, it, expect } from "vitest";
import { ALL_SKIN_IDS, getSkin } from "@/lib/skins/themeRegistry";
import type { ThemeColorTokens, ThemeMode } from "@/lib/theme/types";

const MODES: ThemeMode[] = ["light", "dark"];

const PAIRS: Array<{
  bg: keyof ThemeColorTokens;
  fg: keyof ThemeColorTokens;
  min: number;
}> = [
  { bg: "background", fg: "foreground", min: 4.5 },
  { bg: "card", fg: "cardForeground", min: 4.5 },
  { bg: "primary", fg: "primaryForeground", min: 3.0 },
  { bg: "destructive", fg: "destructiveForeground", min: 3.0 },
];

function parseHsl(v: string): [number, number, number] {
  const m = v.match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) throw new Error(`invalid HSL: ${v}`);
  return [+m[1], +m[2] / 100, +m[3] / 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [r1 + m, g1 + m, b1 + m];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relLuminance(hslToRgb(...parseHsl(a)));
  const lb = relLuminance(hslToRgb(...parseHsl(b)));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe("skin contrast — WCAG enforced thresholds", () => {
  for (const id of ALL_SKIN_IDS) {
    for (const mode of MODES) {
      for (const { bg, fg, min } of PAIRS) {
        it(`${id} (${mode}) — ${bg}/${fg} ≥ ${min}`, () => {
          const colors = getSkin(id).tokens[mode].colors;
          const ratio = contrastRatio(colors[bg], colors[fg]);
          expect(ratio, `${id}/${mode}/${bg}-${fg} = ${ratio.toFixed(2)}`)
            .toBeGreaterThanOrEqual(min);
        });
      }
    }
  }
});
