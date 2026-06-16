import { describe, it, expect } from "vitest";
import {
  applyLegacyBrandScalars,
  parseThemeConfig,
  readThemeConfig,
  resolveOrganizationTheme,
  serializeThemeConfig,
} from "@/lib/skins/themeConfig";
import { BASE_THEME } from "@/lib/theme/baseTheme";
import { getSkin } from "@/lib/skins/themeRegistry";

describe("parseThemeConfig", () => {
  it("returns general fallback for null / non-object / missing theme", () => {
    expect(parseThemeConfig(null)).toEqual({ skinId: "general", branding: {} });
    expect(parseThemeConfig(undefined)).toEqual({ skinId: "general", branding: {} });
    expect(parseThemeConfig("nope")).toEqual({ skinId: "general", branding: {} });
    expect(parseThemeConfig({})).toEqual({ skinId: "general", branding: {} });
    expect(parseThemeConfig({ theme: 42 })).toEqual({ skinId: "general", branding: {} });
  });

  it("normalizes a valid theme blob", () => {
    const parsed = parseThemeConfig({
      crm: { provider: "clio" }, // unrelated, must not affect anything
      theme: {
        skin_id: "legal",
        overrides: {
          brand_name: "Acme Legal",
          logo_url: "https://cdn/x.svg",
          typography: { sans: "Inter, system-ui, sans-serif", mono: "" },
          density: "compact",
          tokens: {
            light: { colors: { primary: "199 89% 48%", bogus: "x" } },
            dark: { colors: { accent: "172 66% 50%" } },
          },
        },
      },
    });
    expect(parsed.skinId).toBe("legal");
    expect(parsed.branding.brandName).toBe("Acme Legal");
    expect(parsed.branding.logoUrl).toBe("https://cdn/x.svg");
    expect(parsed.branding.typography).toEqual({ sans: "Inter, system-ui, sans-serif" });
    expect(parsed.branding.density).toBe("compact");
    expect(parsed.branding.tokens).toEqual({
      light: { colors: { primary: "199 89% 48%" } },
      dark: { colors: { accent: "172 66% 50%" } },
    });
  });

  it("falls back to general for unknown skin id and drops malformed HSL", () => {
    const parsed = parseThemeConfig({
      theme: {
        skin_id: "not_a_skin",
        overrides: {
          tokens: { light: { colors: { primary: "bad-value" } } },
          density: "weird",
        },
      },
    });
    expect(parsed.skinId).toBe("general");
    expect(parsed.branding.tokens).toBeUndefined();
    expect(parsed.branding.density).toBeUndefined();
  });
});

describe("applyLegacyBrandScalars", () => {
  it("fills brand_name / logo_url when JSONB does not set them", () => {
    const cfg = applyLegacyBrandScalars(
      { skinId: "general", branding: {} },
      {
        brand_name: "Legacy Co",
        brand_logo_url: "https://legacy/logo.png",
        brand_primary_color: null,
      },
    );
    expect(cfg.branding.brandName).toBe("Legacy Co");
    expect(cfg.branding.logoUrl).toBe("https://legacy/logo.png");
  });

  it("does not override JSONB-set brand fields", () => {
    const cfg = applyLegacyBrandScalars(
      { skinId: "general", branding: { brandName: "JSON Co", logoUrl: "json-logo" } },
      { brand_name: "Legacy Co", brand_logo_url: "legacy-logo" },
    );
    expect(cfg.branding.brandName).toBe("JSON Co");
    expect(cfg.branding.logoUrl).toBe("json-logo");
  });

  it("mirrors brand_primary_color into both modes only when JSONB primary unset", () => {
    const cfg = applyLegacyBrandScalars(
      {
        skinId: "general",
        branding: {
          tokens: { light: { colors: { primary: "10 10% 10%" } } },
        },
      },
      { brand_primary_color: "200 80% 50%" },
    );
    expect(cfg.branding.tokens?.light?.colors?.primary).toBe("10 10% 10%");
    expect(cfg.branding.tokens?.dark?.colors?.primary).toBe("200 80% 50%");
  });

  it("ignores invalid legacy primary color", () => {
    const cfg = applyLegacyBrandScalars(
      { skinId: "general", branding: {} },
      { brand_primary_color: "#ff00aa" },
    );
    expect(cfg.branding.tokens).toBeUndefined();
  });
});

describe("readThemeConfig", () => {
  it("composes parse + legacy merge in one call", () => {
    const cfg = readThemeConfig({
      integration_configs: {
        theme: { skin_id: "medical", overrides: { brand_name: "Acme Health" } },
      },
      brand_logo_url: "https://legacy/h.png",
      brand_primary_color: "184 72% 36%",
    });
    expect(cfg.skinId).toBe("medical");
    expect(cfg.branding.brandName).toBe("Acme Health");
    expect(cfg.branding.logoUrl).toBe("https://legacy/h.png");
    expect(cfg.branding.tokens?.light?.colors?.primary).toBe("184 72% 36%");
    expect(cfg.branding.tokens?.dark?.colors?.primary).toBe("184 72% 36%");
  });

  it("returns general fallback for null source", () => {
    expect(readThemeConfig(null)).toEqual({ skinId: "general", branding: {} });
  });
});

describe("serializeThemeConfig", () => {
  it("preserves unrelated integration_configs slices", () => {
    const out = serializeThemeConfig(
      { crm: { provider: "clio" }, slack: { token: "xoxb" } },
      {
        skinId: "legal",
        branding: { brandName: "Acme Legal" },
      },
    );
    expect(out.crm).toEqual({ provider: "clio" });
    expect(out.slack).toEqual({ token: "xoxb" });
    expect(out.theme).toEqual({
      skin_id: "legal",
      overrides: { brand_name: "Acme Legal" },
    });
  });

  it("omits empty overrides", () => {
    const out = serializeThemeConfig({}, { skinId: "general", branding: {} });
    expect(out.theme).toEqual({ skin_id: "general" });
  });

  it("round-trips parse → serialize → parse deterministically", () => {
    const original = {
      theme: {
        skin_id: "financial",
        overrides: {
          brand_name: "Acme Fin",
          density: "comfortable",
          tokens: { light: { colors: { primary: "152 64% 28%" } } },
        },
      },
    };
    const parsed = parseThemeConfig(original);
    const serialized = serializeThemeConfig({}, parsed);
    const reparsed = parseThemeConfig(serialized);
    expect(reparsed).toEqual(parsed);
  });
});

describe("resolveOrganizationTheme — precedence", () => {
  it("base only when no org / partner", () => {
    const r = resolveOrganizationTheme({});
    expect(r.skinId).toBe("general");
    expect(r.tokens).toEqual(BASE_THEME);
  });

  it("skin id from organization carrier", () => {
    const r = resolveOrganizationTheme({
      organization: {
        integration_configs: { theme: { skin_id: "legal" } },
      },
    });
    expect(r.skinId).toBe("legal");
    expect(r.tokens.light.colors.primary).toBe(
      getSkin("legal").tokens.light.colors.primary,
    );
  });

  it("org overrides win over partner overrides over skin over base", () => {
    const r = resolveOrganizationTheme({
      organization: {
        integration_configs: {
          theme: {
            skin_id: "legal",
            overrides: {
              tokens: { light: { colors: { primary: "99 99% 99%" } } },
            },
          },
        },
      },
      partner: {
        integration_configs: {
          theme: {
            // partner skin_id is ignored — org is the carrier for skin selection
            skin_id: "medical",
            overrides: {
              tokens: {
                light: { colors: { primary: "10 10% 10%", accent: "20 20% 20%" } },
              },
            },
          },
        },
      },
    });
    // org skin wins
    expect(r.skinId).toBe("legal");
    // org primary wins over partner + skin
    expect(r.tokens.light.colors.primary).toBe("99 99% 99%");
    // partner accent wins over skin/base
    expect(r.tokens.light.colors.accent).toBe("20 20% 20%");
    // legal skin's ring still present (un-overridden)
    expect(r.tokens.light.colors.ring).toBe(
      getSkin("legal").tokens.light.colors.ring,
    );
    // dark untouched (no dark overrides set)
    expect(r.tokens.dark).toEqual(getSkin("legal").tokens.dark);
  });

  it("is deterministic", () => {
    const input = {
      organization: {
        integration_configs: {
          theme: { skin_id: "ecommerce", overrides: { brand_name: "Shop" } },
        },
      } as const,
    };
    expect(resolveOrganizationTheme(input)).toEqual(resolveOrganizationTheme(input));
  });

  it("legacy brand_primary_color participates in resolution when JSONB silent", () => {
    const r = resolveOrganizationTheme({
      organization: {
        integration_configs: { theme: { skin_id: "general" } },
        brand_primary_color: "200 80% 50%",
      },
    });
    expect(r.tokens.light.colors.primary).toBe("200 80% 50%");
    expect(r.tokens.dark.colors.primary).toBe("200 80% 50%");
  });
});
