import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveAscWizardFlag,
  resolveAscWizardFlagFromConfigs,
} from "@/lib/asc/flagResolver";

describe("ASC flag resolution (Slice 2)", () => {
  describe("pure config merge", () => {
    it("returns false when all scopes are null/empty (defensive default)", () => {
      expect(resolveAscWizardFlagFromConfigs(null, null, null).enabled).toBe(false);
      expect(resolveAscWizardFlagFromConfigs({}, {}, {}).enabled).toBe(false);
    });

    it("only the literal boolean true enables ASC (defensive)", () => {
      const truthy = [1, "true", "1", "yes", {}, []];
      for (const v of truthy) {
        const cfg = { features: { ascWizard: { enabled: v as unknown } } };
        expect(
          resolveAscWizardFlagFromConfigs(null, null, cfg as never).enabled,
        ).toBe(false);
      }
    });

    it("returns true with source=org when org explicitly enables", () => {
      const cfg = { features: { ascWizard: { enabled: true } } };
      const res = resolveAscWizardFlagFromConfigs(null, null, cfg as never);
      expect(res).toEqual({ enabled: true, source: "org" });
    });

    it("client wins over partner wins over org (precedence sourcing)", () => {
      const on = { features: { ascWizard: { enabled: true } } } as never;
      expect(
        resolveAscWizardFlagFromConfigs(on, on, on).source,
      ).toBe("client");
      expect(
        resolveAscWizardFlagFromConfigs(null, on, on).source,
      ).toBe("partner");
      expect(
        resolveAscWizardFlagFromConfigs(null, null, on).source,
      ).toBe("org");
    });

    it("malformed nested values resolve to off", () => {
      const bad = { features: "yes" } as never;
      expect(resolveAscWizardFlagFromConfigs(bad, bad, bad).enabled).toBe(false);
      const bad2 = { features: { ascWizard: "true" } } as never;
      expect(resolveAscWizardFlagFromConfigs(null, null, bad2).enabled).toBe(false);
    });
  });

  describe("dev override", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it("dev override enables when storage value is '1'", () => {
      const storage: Pick<Storage, "getItem"> = {
        getItem: (k) =>
          k === "fabric59.features.ascWizard.enabled" ? "1" : null,
      };
      const res = resolveAscWizardFlag({}, { storage });
      expect(res).toEqual({ enabled: true, source: "dev-override" });
    });

    it("dev override falls through when storage is empty", () => {
      const storage: Pick<Storage, "getItem"> = { getItem: () => null };
      const res = resolveAscWizardFlag({ org: {} }, { storage });
      expect(res.enabled).toBe(false);
      expect(res.source).toBe("default");
    });
  });
});
