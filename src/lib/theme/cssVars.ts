/**
 * Vertical Skin System — Phase 4
 * CSS variable injection.
 *
 * Pure helpers that translate a `ThemeTokens` object into the
 * `--token` CSS custom property strings consumed by Tailwind/shadcn,
 * and apply them onto a target element (typically <html>).
 */

import { CSS_VAR_MAP } from "./tokens";
import type { ThemeColorTokens, ThemeTokens } from "./types";

export interface CssVarMap {
  [varName: string]: string;
}

/** Build the `--token → value` record for a resolved theme. */
export function toCssVars(tokens: ThemeTokens): CssVarMap {
  const out: CssVarMap = {};
  for (const key of Object.keys(CSS_VAR_MAP) as Array<keyof ThemeColorTokens>) {
    const cssVarName = CSS_VAR_MAP[key];
    const value = tokens.colors[key];
    if (typeof value === "string" && value.length) {
      out[`--${cssVarName}`] = value;
    }
  }
  if (tokens.radius?.base) {
    out["--radius"] = tokens.radius.base;
  }
  return out;
}

/** Apply a css-var record onto an element's inline style. Returns the keys
 *  that were applied so callers can clean them up on unmount. */
export function applyCssVars(vars: CssVarMap, target: HTMLElement): string[] {
  const applied: string[] = [];
  for (const [name, value] of Object.entries(vars)) {
    target.style.setProperty(name, value);
    applied.push(name);
  }
  return applied;
}

export function removeCssVars(names: string[], target: HTMLElement): void {
  for (const name of names) target.style.removeProperty(name);
}
