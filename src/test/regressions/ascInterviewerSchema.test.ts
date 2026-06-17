/**
 * ASC Slice 3 — Interviewer schema validator.
 *
 * Strict parsing: any deviation returns null so the caller can surface a
 * recoverable error instead of corrupting the draft.
 */
import { describe, it, expect } from "vitest";
import { parseInterviewerResponse } from "@/lib/asc/interviewerSchema";

describe("parseInterviewerResponse (Slice 3)", () => {
  const valid = {
    step: 1,
    nextQuestion: {
      id: "q-1",
      prompt: "What industry?",
      targetField: "business.industryPresetId",
      inputKind: "text",
    },
    proposedFields: [
      {
        targetField: "business.industryPresetId",
        value: "legal",
        confidence: "medium",
        rationale: "Mentioned attorneys.",
      },
    ],
    confirmedFieldsAcknowledged: ["business.description"],
  };

  it("accepts a well-formed response", () => {
    const out = parseInterviewerResponse(valid);
    expect(out).not.toBeNull();
    expect(out?.nextQuestion?.targetField).toBe("business.industryPresetId");
    expect(out?.proposedFields).toHaveLength(1);
  });

  it("accepts nextQuestion=null", () => {
    const out = parseInterviewerResponse({
      ...valid,
      nextQuestion: null,
      proposedFields: [],
    });
    expect(out).not.toBeNull();
    expect(out?.nextQuestion).toBeNull();
  });

  it("rejects unknown targetField in nextQuestion", () => {
    expect(
      parseInterviewerResponse({
        ...valid,
        nextQuestion: { ...valid.nextQuestion, targetField: "guide.opener" },
      }),
    ).toBeNull();
  });

  it("rejects unknown targetField in proposedFields", () => {
    expect(
      parseInterviewerResponse({
        ...valid,
        proposedFields: [
          { ...valid.proposedFields[0], targetField: "flow.entry" },
        ],
      }),
    ).toBeNull();
  });

  it("rejects step outside {1,2,3,4}", () => {
    expect(parseInterviewerResponse({ ...valid, step: 5 })).toBeNull();
  });


  it("rejects missing proposedFields array", () => {
    const { proposedFields: _omit, ...bad } = valid;
    void _omit;
    expect(parseInterviewerResponse(bad)).toBeNull();
  });

  it("rejects bad confidence value", () => {
    expect(
      parseInterviewerResponse({
        ...valid,
        proposedFields: [
          { ...valid.proposedFields[0], confidence: "definitely" },
        ],
      }),
    ).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseInterviewerResponse("nope")).toBeNull();
    expect(parseInterviewerResponse(null)).toBeNull();
  });
});
