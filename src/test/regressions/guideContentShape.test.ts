import { describe, it, expect } from "vitest";
import {
  guideContentV1Schema,
  migrateGuideContentToV1,
  isHttpUrl,
} from "@/lib/guides/guideContentSchema";

describe("guideContentSchema", () => {
  it("accepts a valid GuideContentV1", () => {
    const v = {
      schemaVersion: 1,
      blocks: [
        { id: "1", type: "heading", text: "Intro" },
        { id: "2", type: "paragraph", text: "Hi" },
        { id: "3", type: "info", text: "FYI" },
        { id: "4", type: "script", text: "Say this" },
        { id: "5", type: "connector", label: "Portal", href: "https://x.test" },
      ],
    };
    expect(guideContentV1Schema.safeParse(v).success).toBe(true);
    expect(migrateGuideContentToV1(v)).toEqual(v);
  });

  it.each([
    null,
    undefined,
    {},
    [],
    { schemaVersion: 2, blocks: [] },
    { nodes: [], edges: [] },
    { schemaVersion: 1, blocks: [{ id: "x", type: "unknown" }] },
    "not an object",
    42,
  ])("collapses malformed input %#  to empty V1", (raw) => {
    expect(migrateGuideContentToV1(raw)).toEqual({ schemaVersion: 1, blocks: [] });
  });

  it("is idempotent on empty V1", () => {
    const empty = { schemaVersion: 1 as const, blocks: [] };
    expect(migrateGuideContentToV1(migrateGuideContentToV1(empty))).toEqual(empty);
  });

  it("isHttpUrl validates http(s) only", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com/path?q=1")).toBe(true);
    expect(isHttpUrl("ftp://x")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("example.com")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });
});
