/**
 * Vertical Skin System — Phase 4
 * CSS variable injection + provider tests.
 */

import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { applyCssVars, removeCssVars, toCssVars } from "@/lib/theme/cssVars";
import { resolveTheme } from "@/lib/theme/themeResolver";
import { EmbedSkinProvider } from "@/lib/skins/SkinProvider";
import { getSkin } from "@/lib/skins/themeRegistry";

afterEach(() => {
  cleanup();
  // Clear any stray inline vars from previous tests.
  const root = document.documentElement;
  root.removeAttribute("data-skin");
  root.removeAttribute("data-density");
  root.style.cssText = "";
});

describe("toCssVars", () => {
  it("emits one CSS variable per color token plus --radius", () => {
    const theme = resolveTheme({ skinId: "general" });
    const vars = toCssVars(theme.tokens.light);
    expect(vars["--background"]).toBeDefined();
    expect(vars["--primary"]).toBeDefined();
    expect(vars["--sidebar-background"]).toBeDefined();
    expect(vars["--node-question"]).toBeDefined();
    expect(vars["--radius"]).toBe("0.5rem");
  });

  it("changes --primary when a non-general skin is resolved", () => {
    const general = toCssVars(resolveTheme({ skinId: "general" }).tokens.light);
    const legal = toCssVars(resolveTheme({ skinId: "legal" }).tokens.light);
    expect(legal["--primary"]).not.toEqual(general["--primary"]);
  });
});

describe("applyCssVars / removeCssVars", () => {
  it("writes variables onto the target element and removes them on cleanup", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const applied = applyCssVars({ "--x-test": "1 2% 3%", "--y-test": "9px" }, el);
    expect(el.style.getPropertyValue("--x-test")).toBe("1 2% 3%");
    expect(applied).toContain("--x-test");
    removeCssVars(applied, el);
    expect(el.style.getPropertyValue("--x-test")).toBe("");
    el.remove();
  });
});

describe("EmbedSkinProvider", () => {
  it("injects CSS variables and data-skin onto <html> for a non-general skin", () => {
    const legal = getSkin("legal");
    render(
      <EmbedSkinProvider
        theme={{ skinId: legal.id, tokens: legal.tokens }}
        mode="light"
      >
        <div>embed</div>
      </EmbedSkinProvider>,
    );
    const root = document.documentElement;
    expect(root.getAttribute("data-skin")).toBe("legal");
    expect(root.style.getPropertyValue("--primary")).toBe(legal.tokens.light.colors.primary);
  });

  it("falls back to general when resolving from empty branding sources", () => {
    render(
      <EmbedSkinProvider organization={null} partner={null} mode="light">
        <div>embed</div>
      </EmbedSkinProvider>,
    );
    expect(document.documentElement.getAttribute("data-skin")).toBe("general");
  });

  it("cleans up applied vars when unmounted", () => {
    const { unmount } = render(
      <EmbedSkinProvider
        theme={{ skinId: "legal", tokens: getSkin("legal").tokens }}
        mode="light"
      >
        <div>embed</div>
      </EmbedSkinProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--primary")).not.toBe("");
    unmount();
    expect(document.documentElement.getAttribute("data-skin")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });

  it("resolves org overrides on top of partner overrides on top of skin", () => {
    render(
      <EmbedSkinProvider
        organization={{
          integration_configs: {
            theme: {
              skin_id: "general",
              overrides: { tokens: { light: { colors: { primary: "10 20% 30%" } } } },
            },
          },
        }}
        partner={{
          integration_configs: {
            theme: {
              overrides: { tokens: { light: { colors: { primary: "99 99% 99%" } } } },
            },
          },
        }}
        mode="light"
      >
        <div>embed</div>
      </EmbedSkinProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("10 20% 30%");
  });
});
