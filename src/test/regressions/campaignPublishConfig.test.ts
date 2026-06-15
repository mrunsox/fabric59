import { describe, it, expect } from "vitest";
import {
  normalizePublishConfig,
  applyPublishPatch,
  buildEmbedUrl,
  buildIframeSnippet,
  safeTokenCompare,
  generatePublishToken,
  readPublishConfigFromMetadata,
} from "@/lib/campaign-publish/publishConfig";
import {
  buildEmbedRuntimeContext,
  extractAccessToken,
} from "@/lib/campaign-publish/runtimeContext";
import { DEFAULT_PUBLISH_CONFIG } from "@/lib/campaign-publish/types";

describe("publish config normalization", () => {
  it("defaults when metadata is missing or malformed", () => {
    expect(readPublishConfigFromMetadata(undefined)).toEqual(DEFAULT_PUBLISH_CONFIG);
    expect(readPublishConfigFromMetadata({ publish: "garbage" })).toEqual(DEFAULT_PUBLISH_CONFIG);
  });

  it("coerces invalid enum values to defaults", () => {
    const cfg = normalizePublishConfig({
      enabled: true,
      access: "bogus",
      theme: "neon",
      token: "abc",
    });
    expect(cfg.enabled).toBe(true);
    expect(cfg.access).toBe("public");
    expect(cfg.theme).toBe("light");
    // token only honored when access === token
    expect(cfg.token).toBeNull();
  });

  it("preserves valid token in token mode", () => {
    const cfg = normalizePublishConfig({ enabled: true, access: "token", token: "tok-123" });
    expect(cfg.access).toBe("token");
    expect(cfg.token).toBe("tok-123");
  });

  it("preserves unrelated metadata keys when patching", () => {
    const meta = { other: { foo: 1 }, publish: { enabled: false } };
    const next = applyPublishPatch(meta, { enabled: true });
    expect(next.other).toEqual({ foo: 1 });
    expect((next.publish as { enabled: boolean }).enabled).toBe(true);
  });
});

describe("publish urls", () => {
  it("builds canonical embed URL without token", () => {
    expect(buildEmbedUrl({ origin: "https://app/", campaignId: "abc" })).toBe(
      "https://app/embed/c/abc",
    );
  });
  it("appends token when provided", () => {
    expect(
      buildEmbedUrl({ origin: "https://app", campaignId: "abc", token: "xyz" }),
    ).toBe("https://app/embed/c/abc?t=xyz");
  });
  it("iframe snippet contains Five9 templating", () => {
    const snippet = buildIframeSnippet({ embedUrl: "https://app/embed/c/abc" });
    expect(snippet).toContain("{{$Call.call_id}}");
    expect(snippet).toContain("{{$Agent.username}}");
    expect(snippet).toContain("https://app/embed/c/abc?call_id=");
  });
});

describe("token compare", () => {
  it("returns true for identical strings", () => {
    expect(safeTokenCompare("abc", "abc")).toBe(true);
  });
  it("returns false for mismatched length or content", () => {
    expect(safeTokenCompare("abc", "abcd")).toBe(false);
    expect(safeTokenCompare("abc", "abd")).toBe(false);
    expect(safeTokenCompare(null, "abc")).toBe(false);
  });
  it("generates URL-safe tokens of >=20 chars", () => {
    const t = generatePublishToken();
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(/^[A-Za-z0-9_-]+$/.test(t)).toBe(true);
  });
});

describe("embed runtime context", () => {
  it("normalizes supported params and clips length", () => {
    const long = "x".repeat(500);
    const ctx = buildEmbedRuntimeContext(
      `call_id=abc&ani=555-0100&agent_name=${long}&theme=dark&mode=embed&unknown=hello`,
    );
    expect(ctx.callId).toBe("abc");
    expect(ctx.ani).toBe("555-0100");
    expect(ctx.agentName?.length).toBe(256);
    expect(ctx.theme).toBe("dark");
    expect(ctx.mode).toBe("embed");
    expect(ctx.passthrough.unknown).toBe("hello");
  });

  it("rejects invalid mode/theme values, falls back to defaults", () => {
    const ctx = buildEmbedRuntimeContext("mode=bogus&theme=hot");
    expect(ctx.mode).toBe("embed");
    expect(ctx.theme).toBe("light");
  });

  it("caps passthrough entries", () => {
    const parts: string[] = [];
    for (let i = 0; i < 100; i++) parts.push(`extra_${i}=v${i}`);
    const ctx = buildEmbedRuntimeContext(parts.join("&"));
    expect(Object.keys(ctx.passthrough).length).toBeLessThanOrEqual(32);
  });

  it("strips control characters", () => {
    const ctx = buildEmbedRuntimeContext("agent_name=al%00ice");
    expect(ctx.agentName).toBe("alice");
  });

  it("honors paramMap aliases", () => {
    const ctx = buildEmbedRuntimeContext("five9_caller=12345", { five9_caller: "ani" });
    expect(ctx.ani).toBe("12345");
  });

  it("extracts access token separately from runtime context", () => {
    expect(extractAccessToken("t=secret-token&ani=555")).toBe("secret-token");
    const ctx = buildEmbedRuntimeContext("t=secret-token&ani=555");
    // Token must NOT leak into runtime context fields
    expect(JSON.stringify(ctx)).not.toContain("secret-token");
  });
});
