/**
 * ASC Slice 4 — Gap-finder response schema validator.
 */
import { describe, it, expect } from "vitest";
import { parseGapFinderResponse } from "@/lib/asc/gapFinderSchema";

const valid = {
  step: 3,
  items: [
    {
      id: "g-1",
      kind: "missing_handling",
      message: "No handling for Intake.",
      reasonIds: ["cr-1"],
    },
  ],
};

describe("parseGapFinderResponse (Slice 4)", () => {
  it("accepts a well-formed response", () => {
    const out = parseGapFinderResponse(valid);
    expect(out).not.toBeNull();
    expect(out?.items).toHaveLength(1);
  });

  it("accepts empty items", () => {
    const out = parseGapFinderResponse({ step: 4, items: [] });
    expect(out?.items).toHaveLength(0);
  });

  it("rejects unknown kind", () => {
    expect(
      parseGapFinderResponse({
        ...valid,
        items: [{ ...valid.items[0], kind: "fabricated_kind" }],
      }),
    ).toBeNull();
  });

  it("rejects oversize message", () => {
    expect(
      parseGapFinderResponse({
        ...valid,
        items: [{ ...valid.items[0], message: "x".repeat(241) }],
      }),
    ).toBeNull();
  });

  it("rejects step outside {3,4}", () => {
    expect(parseGapFinderResponse({ step: 2, items: [] })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseGapFinderResponse(null)).toBeNull();
    expect(parseGapFinderResponse("nope")).toBeNull();
  });

  it("rejects non-string reasonIds", () => {
    expect(
      parseGapFinderResponse({
        ...valid,
        items: [{ ...valid.items[0], reasonIds: [1, 2] }],
      }),
    ).toBeNull();
  });
});
