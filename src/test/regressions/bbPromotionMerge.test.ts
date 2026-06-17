/**
 * Business Brain — promotion / merge regression test (Slice 1).
 *
 * Guards the duplicate-merge rule: when overlapping extractions are merged
 * into the same fact, source refs are preserved (deduped, no loss).
 */
import { describe, it, expect } from "vitest";
import { mergeSourceRefs } from "@/lib/business-brain/promotion";

describe("Business Brain — mergeSourceRefs", () => {
  it("preserves existing refs and appends new ones", () => {
    const existing = [
      { source_id: "s1", extraction_id: "e1", snippet: "hello" },
    ];
    const incoming = [
      { source_id: "s2", extraction_id: "e2", snippet: "world" },
    ];
    const out = mergeSourceRefs(existing, incoming);
    expect(out.source_refs).toHaveLength(2);
    expect(out.source_refs[0]).toEqual(existing[0]);
    expect(out.added).toBe(1);
  });

  it("dedupes by (source_id, extraction_id, snippet)", () => {
    const existing = [
      { source_id: "s1", extraction_id: "e1", snippet: "hello" },
    ];
    const incoming = [
      { source_id: "s1", extraction_id: "e1", snippet: "hello" },
      { source_id: "s1", extraction_id: "e2", snippet: "hello" },
    ];
    const out = mergeSourceRefs(existing, incoming);
    expect(out.source_refs).toHaveLength(2);
    expect(out.added).toBe(1);
  });

  it("does not lose source refs when merging multiple overlapping extractions in sequence", () => {
    // Simulate: fact F has extraction e1. Reviewer merges e2 into F. Then e3.
    let refs = [
      { source_id: "s1", extraction_id: "e1", snippet: "from source one" },
    ];
    refs = mergeSourceRefs(refs, [
      { source_id: "s2", extraction_id: "e2", snippet: "from source two" },
    ]).source_refs;
    refs = mergeSourceRefs(refs, [
      { source_id: "s3", extraction_id: "e3", snippet: "from source three" },
    ]).source_refs;
    expect(refs.map((r) => r.extraction_id).sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("treats null snippet and empty-string snippet as distinct keys only if they differ", () => {
    const out = mergeSourceRefs(
      [{ source_id: "s1", extraction_id: null, snippet: null }],
      [{ source_id: "s1", extraction_id: null, snippet: null }],
    );
    expect(out.source_refs).toHaveLength(1);
    expect(out.added).toBe(0);
  });
});
