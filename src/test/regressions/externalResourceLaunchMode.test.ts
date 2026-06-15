import { describe, it, expect } from "vitest";
import { resolveLaunchMode } from "@/lib/external-resources/resolveLaunchMode";
import type { ExternalResource } from "@/lib/external-resources/types";

function res(p: Partial<ExternalResource> & { id: string }): ExternalResource {
  return {
    id: p.id,
    label: p.id,
    kind: "website",
    url: "https://x.example.com",
    enabled: true,
    openMode: "auto",
    sortOrder: 0,
    tags: [],
    issueTags: [],
    specialtyTags: [],
    dispositionTags: [],
    urgencyTags: [],
    allowParamInjection: false,
    ...p,
  };
}

describe("launch-mode resolution", () => {
  it("auto resolves calendar to drawer", () => {
    const r = resolveLaunchMode({ resource: res({ id: "a", kind: "calendar", openMode: "auto" }), context: { embedMode: "internal" } });
    expect(r.mode).toBe("drawer");
  });

  it("auto resolves portal to new_tab", () => {
    const r = resolveLaunchMode({ resource: res({ id: "a", kind: "portal", openMode: "auto" }), context: { embedMode: "internal" } });
    expect(r.mode).toBe("new_tab");
  });

  it("auto resolves website/document/form to iframe", () => {
    for (const kind of ["website", "document", "form"] as const) {
      const r = resolveLaunchMode({ resource: res({ id: "a", kind, openMode: "auto" }), context: { embedMode: "internal" } });
      expect(r.mode).toBe("iframe");
    }
  });

  it("downgrades replace_center → drawer in embed mode", () => {
    const r = resolveLaunchMode({
      resource: res({ id: "a", openMode: "replace_center" }),
      context: { embedMode: "embed" },
    });
    expect(r.mode).toBe("drawer");
    expect(r.downgraded).toBe(true);
    expect(r.originalMode).toBe("replace_center");
  });

  it("downgrades iframe → new_tab on very narrow viewports", () => {
    const r = resolveLaunchMode({
      resource: res({ id: "a", openMode: "iframe" }),
      context: { embedMode: "internal", viewportWidth: 480 },
    });
    expect(r.mode).toBe("new_tab");
    expect(r.downgraded).toBe(true);
  });

  it("honors preferredWidth", () => {
    const r = resolveLaunchMode({
      resource: res({ id: "a", openMode: "drawer", preferredWidth: "full" }),
      context: { embedMode: "internal" },
    });
    expect(r.width).toBe("full");
  });

  it("applies param injection when enabled", () => {
    const r = resolveLaunchMode({
      resource: res({
        id: "a",
        url: "https://x.example.com/path",
        allowParamInjection: true,
        paramTemplate: { phone: "{{ani}}" },
      }),
      context: { embedMode: "internal", runtime: { ani: "555" } },
    });
    expect(r.resolvedUrl).toContain("phone=555");
  });

  it("never produces a non-http URL even when source is malformed", () => {
    const r = resolveLaunchMode({
      resource: res({ id: "a", url: "https://ok.example.com" }),
      context: { embedMode: "internal" },
    });
    expect(/^https?:\/\//.test(r.resolvedUrl)).toBe(true);
  });
});
