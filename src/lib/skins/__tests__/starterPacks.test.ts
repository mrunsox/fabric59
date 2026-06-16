/**
 * Vertical Skin System — Phase 5
 * Starter-pack + copy-preset resolver tests.
 */

import { describe, expect, it } from "vitest";

import { ALL_SKIN_IDS } from "@/lib/skins/themeRegistry";
import {
  CAMPAIGN_TEMPLATE_BY_STARTER_ID,
  GUIDE_TEMPLATE_BY_STARTER_ID,
  FALLBACK_CAMPAIGN_TEMPLATE_ID,
  FALLBACK_GUIDE_TEMPLATE_ID,
  getStarterPacks,
  listStarterPackBindings,
  resolveCampaignTemplateForSkin,
  resolveGuideTemplateForSkin,
} from "@/lib/skins/starterPacks";
import {
  FALLBACK_COPY_PRESET_ID,
  getCopyPreset,
  getCopyPresetForSkin,
  listCopyPresets,
} from "@/lib/skins/copyPresets";

describe("Phase 5 · starter-pack resolver", () => {
  it("returns deterministic bindings for every canonical skin", () => {
    for (const id of ALL_SKIN_IDS) {
      const a = getStarterPacks(id);
      const b = getStarterPacks(id);
      expect(a).toEqual(b);
      expect(a.guide).toBeTruthy();
      expect(a.campaign).toBeTruthy();
      expect(a.transferDirectory).toBeTruthy();
      expect(a.externalResources).toBeTruthy();
      expect(a.outcomes).toBeTruthy();
    }
  });

  it("falls back to general for unknown skin ids", () => {
    const general = getStarterPacks("general");
    expect(getStarterPacks(undefined)).toEqual(general);
    expect(getStarterPacks(null)).toEqual(general);
    expect(getStarterPacks("not-a-skin" as never)).toEqual(general);
  });

  it("resolves the legal guide template for the legal skin", () => {
    const t = resolveGuideTemplateForSkin("legal");
    expect(t.id).toBe(GUIDE_TEMPLATE_BY_STARTER_ID["legal.default"]);
    expect(t.id).toBe("legal-firm-starter");
  });

  it("resolves the legal intake campaign template for the legal skin", () => {
    const t = resolveCampaignTemplateForSkin("legal");
    expect(t.id).toBe(CAMPAIGN_TEMPLATE_BY_STARTER_ID["legal.default"]);
    expect(t.id).toBe("legal-intake");
  });

  it("verticals without bespoke templates fall back to generic", () => {
    for (const id of ALL_SKIN_IDS) {
      if (id === "legal") continue;
      expect(resolveGuideTemplateForSkin(id).id).toBe(FALLBACK_GUIDE_TEMPLATE_ID);
      expect(resolveCampaignTemplateForSkin(id).id).toBe(FALLBACK_CAMPAIGN_TEMPLATE_ID);
    }
  });

  it("unknown / null skin ids resolve to the generic templates", () => {
    expect(resolveGuideTemplateForSkin(undefined).id).toBe(FALLBACK_GUIDE_TEMPLATE_ID);
    expect(resolveCampaignTemplateForSkin("not-a-skin" as never).id).toBe(
      FALLBACK_CAMPAIGN_TEMPLATE_ID,
    );
  });

  it("listStarterPackBindings is stable and complete", () => {
    const list = listStarterPackBindings();
    expect(list.map((e) => e.skinId)).toEqual([...ALL_SKIN_IDS]);
    for (const entry of list) {
      expect(entry.bindings).toEqual(getStarterPacks(entry.skinId));
    }
  });
});

describe("Phase 5 · copy-preset registry", () => {
  it("every canonical skin resolves a copy preset", () => {
    for (const id of ALL_SKIN_IDS) {
      const preset = getCopyPresetForSkin(id);
      expect(preset.id).toMatch(/\.default$/);
      expect(preset.greetings.length).toBeGreaterThan(0);
      expect(preset.callOpeners.length).toBeGreaterThan(0);
      expect(preset.transferLines.warm).toBeTruthy();
      expect(preset.transferLines.cold).toBeTruthy();
      expect(preset.transferLines.voicemail).toBeTruthy();
    }
  });

  it("non-general skins use vertical-specific copy", () => {
    const general = getCopyPresetForSkin("general");
    const medical = getCopyPresetForSkin("medical");
    const property = getCopyPresetForSkin("property_management");
    expect(medical.callerNoun).toBe("patient");
    expect(property.callerNoun).toBe("resident");
    expect(medical.id).not.toBe(general.id);
  });

  it("falls back to general for unknown ids and skins", () => {
    expect(getCopyPreset(null).id).toBe(FALLBACK_COPY_PRESET_ID);
    expect(getCopyPreset(undefined).id).toBe(FALLBACK_COPY_PRESET_ID);
    expect(getCopyPreset("nope").id).toBe(FALLBACK_COPY_PRESET_ID);
    expect(getCopyPresetForSkin(undefined).id).toBe(FALLBACK_COPY_PRESET_ID);
    expect(getCopyPresetForSkin("not-a-skin" as never).id).toBe(FALLBACK_COPY_PRESET_ID);
  });

  it("listCopyPresets covers all 10 canonical preset ids", () => {
    const ids = listCopyPresets().map((p) => p.id);
    expect(ids).toHaveLength(ALL_SKIN_IDS.length);
    for (const skinId of ALL_SKIN_IDS) {
      expect(ids).toContain(`${skinId}.default`);
    }
  });

  it("lookup is deterministic across calls", () => {
    const a = getCopyPresetForSkin("ecommerce");
    const b = getCopyPresetForSkin("ecommerce");
    expect(a).toEqual(b);
  });
});
