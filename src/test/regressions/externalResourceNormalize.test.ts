import { describe, it, expect } from "vitest";
import {
  normalizeExternalResources,
  sanitizeResourceUrl,
} from "@/lib/external-resources/normalize";

describe("external-resources normalization", () => {
  it("rejects javascript: and data: URLs", () => {
    expect(sanitizeResourceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeResourceUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeResourceUrl("file:///etc/passwd")).toBeNull();
  });

  it("accepts http(s) URLs and rejects malformed values", () => {
    expect(sanitizeResourceUrl("https://example.com/x?y=1")).toMatch(/^https:/);
    expect(sanitizeResourceUrl("not a url")).toBeNull();
    expect(sanitizeResourceUrl("   ")).toBeNull();
    expect(sanitizeResourceUrl(undefined)).toBeNull();
  });

  it("drops resources without label or valid URL silently", () => {
    const cfg = normalizeExternalResources({
      resources: [
        { id: "a", label: "Good", url: "https://ok.example.com" },
        { id: "b", url: "https://x.example.com" }, // no label
        { id: "c", label: "Bad", url: "javascript:alert(1)" },
        { id: "d", label: "Also bad", url: "" },
      ],
      rules: [],
    });
    expect(cfg.resources.map((r) => r.id)).toEqual(["a"]);
  });

  it("clamps urgency tags to the allowed enum", () => {
    const cfg = normalizeExternalResources({
      resources: [
        {
          id: "a",
          label: "A",
          url: "https://x.test",
          urgencyTags: ["high", "ultra", "low"],
        },
      ],
      rules: [],
    });
    expect(cfg.resources[0].urgencyTags).toEqual(["high", "low"]);
  });

  it("defaults openMode and kind when missing/invalid", () => {
    const cfg = normalizeExternalResources({
      resources: [
        { id: "a", label: "A", url: "https://x.test", openMode: "xyz", kind: "garbage" },
      ],
      rules: [],
    });
    expect(cfg.resources[0].openMode).toBe("auto");
    expect(cfg.resources[0].kind).toBe("custom");
  });

  it("preserves param templates only when allowParamInjection enables them", () => {
    const cfg = normalizeExternalResources({
      resources: [
        {
          id: "a",
          label: "A",
          url: "https://booking.example.com",
          allowParamInjection: true,
          paramTemplate: { phone: "{{ani}}", evil: "x", "with space": "{{ani}}" },
        },
      ],
      rules: [],
    });
    expect(cfg.resources[0].paramTemplate).toEqual({ phone: "{{ani}}", evil: "x" });
  });

  it("stable-sorts resources by sortOrder then label", () => {
    const cfg = normalizeExternalResources({
      resources: [
        { id: "z", label: "Z", url: "https://z.test", sortOrder: 2 },
        { id: "a", label: "A", url: "https://a.test", sortOrder: 0 },
        { id: "m", label: "M", url: "https://m.test", sortOrder: 1 },
      ],
      rules: [],
    });
    expect(cfg.resources.map((r) => r.id)).toEqual(["a", "m", "z"]);
  });
});
