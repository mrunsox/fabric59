/**
 * ASC Slice 5 — Logic Architect response schema validation.
 */
import { describe, it, expect } from "vitest";
import {
  parseLogicArchitectResponse,
  normalizeSlug,
  slugIsUnique,
} from "@/lib/asc/logicArchitectSchema";

describe("parseLogicArchitectResponse", () => {
  it("accepts a well-formed Step 5 outcomes response", () => {
    const r = parseLogicArchitectResponse({
      step: 5,
      proposals: [
        {
          id: "p1",
          targetField: "outcomes.add",
          value: { label: "Booked consult", kind: "success" },
          confidence: "high",
          rationale: "Matches purpose.",
        },
      ],
      advisories: [],
    });
    expect(r?.proposals).toHaveLength(1);
  });

  it("accepts a well-formed Step 6 notifications response", () => {
    const r = parseLogicArchitectResponse({
      step: 6,
      proposals: [
        {
          id: "p1",
          targetField: "notifications.add",
          value: {
            outcomeRef: "Booked consult",
            channelRef: "slack:#intake",
            audienceRef: "intake-team",
            urgency: "normal",
          },
          confidence: "medium",
          rationale: "Tell the intake team.",
        },
      ],
      advisories: [{ message: "Connect Slack to enable rich routing." }],
    });
    expect(r?.proposals[0].value).toMatchObject({ urgency: "normal" });
    expect(r?.advisories).toHaveLength(1);
  });

  it("accepts a well-formed Step 7 destination + slug candidates response", () => {
    const r = parseLogicArchitectResponse({
      step: 7,
      proposals: [
        {
          id: "p1",
          targetField: "destination.kind",
          value: "internal_runner",
          confidence: "high",
          rationale: "Default for new campaigns.",
        },
        {
          id: "p2",
          targetField: "launch.slugCandidates",
          value: ["intake", "client-intake", "new-intake"],
          confidence: "medium",
          rationale: "Short, relevant.",
        },
      ],
      advisories: [],
    });
    expect(r?.proposals).toHaveLength(2);
  });

  it("rejects unknown targetFields", () => {
    expect(
      parseLogicArchitectResponse({
        step: 5,
        proposals: [
          {
            id: "p1",
            targetField: "outcomes.delete",
            value: {},
            confidence: "high",
            rationale: "x",
          },
        ],
        advisories: [],
      }),
    ).toBeNull();
  });

  it("rejects bad value shapes for outcomes.add", () => {
    expect(
      parseLogicArchitectResponse({
        step: 5,
        proposals: [
          {
            id: "p1",
            targetField: "outcomes.add",
            value: { label: "x", kind: "bogus" },
            confidence: "high",
            rationale: "x",
          },
        ],
        advisories: [],
      }),
    ).toBeNull();
  });

  it("rejects step outside 5..7", () => {
    expect(
      parseLogicArchitectResponse({ step: 4, proposals: [], advisories: [] }),
    ).toBeNull();
  });
});

describe("slug helpers", () => {
  it("normalizes slugs to kebab-case ASCII", () => {
    expect(normalizeSlug("  My Campaign! ")).toBe("my-campaign");
  });

  it("rejects empty normalized slugs", () => {
    expect(slugIsUnique("   ", [])).toBe(false);
  });

  it("treats case-insensitive collisions as taken", () => {
    expect(slugIsUnique("my-Intake", ["MY-INTAKE"])).toBe(false);
  });

  it("returns true when slug not present", () => {
    expect(slugIsUnique("fresh-slug", ["taken-one"])).toBe(true);
  });
});
