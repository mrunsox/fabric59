/**
 * Vertical Skin System — Phase 1
 * Base theme values mirrored from src/index.css.
 *
 * Changing this file changes the default visual baseline of the app.
 * Values must remain byte-for-byte equivalent to the existing :root and
 * .dark blocks in src/index.css until Phase 4 migrates consumption.
 */

import type { ThemeModeTokens, ThemeTokens } from "./types";

const lightTheme: ThemeTokens = {
  colors: {
    background: "0 0% 100%",
    foreground: "222 47% 11%",

    card: "0 0% 100%",
    cardForeground: "222 47% 11%",

    popover: "0 0% 100%",
    popoverForeground: "222 47% 11%",

    primary: "199 89% 48%",
    primaryForeground: "0 0% 100%",

    secondary: "215 25% 27%",
    secondaryForeground: "210 40% 98%",

    muted: "220 14% 90%",
    mutedForeground: "220 9% 46%",

    accent: "172 66% 50%",
    accentForeground: "222 47% 11%",

    destructive: "0 84% 60%",
    destructiveForeground: "0 0% 100%",

    border: "220 13% 87%",
    input: "220 13% 87%",
    ring: "199 89% 48%",

    success: "142 76% 36%",
    successForeground: "0 0% 100%",
    warning: "38 92% 50%",
    warningForeground: "0 0% 0%",
    info: "199 89% 48%",
    infoForeground: "0 0% 100%",

    syncing: "199 89% 48%",
    pendingReview: "262 83% 58%",
    disconnected: "220 9% 46%",

    sidebarBackground: "222 47% 11%",
    sidebarForeground: "210 40% 96%",
    sidebarPrimary: "199 89% 48%",
    sidebarPrimaryForeground: "0 0% 100%",
    sidebarAccent: "217 33% 17%",
    sidebarAccentForeground: "210 40% 96%",
    sidebarBorder: "217 33% 17%",
    sidebarRing: "199 89% 48%",

    chart1: "199 89% 48%",
    chart2: "172 66% 50%",
    chart3: "262 83% 58%",
    chart4: "38 92% 50%",
    chart5: "0 84% 60%",

    nodeStart: "280 75% 55%",
    nodeQuestion: "243 75% 59%",
    nodeAction: "187 92% 42%",
    nodeCondition: "38 100% 50%",
    nodeEnd: "152 76% 44%",
    nodeContent: "220 70% 55%",
    nodeData: "45 90% 50%",
    nodeLogic: "280 70% 55%",
    nodeIntegration: "200 80% 50%",
    nodeCall: "25 90% 55%",
    nodeAi: "260 80% 60%",
    nodeFlow: "320 70% 55%",
  },
  radius: {
    base: "0.5rem",
  },
};

const darkTheme: ThemeTokens = {
  colors: {
    background: "222 47% 5%",
    foreground: "210 40% 96%",

    card: "222 47% 8%",
    cardForeground: "210 40% 98%",

    popover: "222 47% 8%",
    popoverForeground: "210 40% 98%",

    primary: "199 89% 48%",
    primaryForeground: "0 0% 100%",

    secondary: "217 33% 15%",
    secondaryForeground: "210 40% 96%",

    muted: "217 33% 14%",
    mutedForeground: "215 20% 65%",

    accent: "172 66% 50%",
    accentForeground: "222 47% 11%",

    destructive: "0 72% 50%",
    destructiveForeground: "0 0% 100%",

    border: "217 33% 15%",
    input: "217 33% 18%",
    ring: "199 89% 48%",

    success: "142 71% 45%",
    successForeground: "0 0% 100%",
    warning: "38 92% 50%",
    warningForeground: "0 0% 0%",
    info: "199 89% 48%",
    infoForeground: "0 0% 100%",

    syncing: "199 89% 48%",
    pendingReview: "262 83% 58%",
    disconnected: "215 20% 45%",

    // Sidebar dark values — kept aligned with src/index.css .dark block.
    sidebarBackground: "222 47% 4%",
    sidebarForeground: "210 40% 96%",
    sidebarPrimary: "199 89% 48%",
    sidebarPrimaryForeground: "0 0% 100%",
    sidebarAccent: "217 33% 17%",
    sidebarAccentForeground: "210 40% 96%",
    sidebarBorder: "217 33% 17%",
    sidebarRing: "199 89% 48%",

    chart1: "199 89% 48%",
    chart2: "172 66% 50%",
    chart3: "262 83% 58%",
    chart4: "38 92% 50%",
    chart5: "0 84% 60%",

    nodeStart: "280 75% 55%",
    nodeQuestion: "243 75% 59%",
    nodeAction: "187 92% 42%",
    nodeCondition: "38 100% 50%",
    nodeEnd: "152 76% 44%",
    nodeContent: "220 70% 55%",
    nodeData: "45 90% 50%",
    nodeLogic: "280 70% 55%",
    nodeIntegration: "200 80% 50%",
    nodeCall: "25 90% 55%",
    nodeAi: "260 80% 60%",
    nodeFlow: "320 70% 55%",
  },
  radius: {
    base: "0.5rem",
  },
};

export const BASE_THEME: ThemeModeTokens = {
  light: lightTheme,
  dark: darkTheme,
};
