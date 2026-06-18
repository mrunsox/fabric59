/**
 * Phase 2 — Business Brain → ASC selector view-model tests.
 *
 * Each `build*Suggestions` builder must produce ranked, capped suggestions
 * whose `apply` intent maps 1:1 to an existing ASC reducer action and whose
 * card metadata is correctly derived from the underlying fact payload.
 */
import { describe, it, expect } from "vitest";
import {
  BB_SUGGESTION_CAP_PER_STEP,
  buildCallerReasonSuggestions,
  buildDestinationSuggestions,
  buildEscalationSuggestions,
  buildIntakeRequirementSuggestions,
  type ApprovedFactView,
} from "@/lib/business-brain/selectors";

function fact(over: Partial<ApprovedFactView> & {
  entityType: ApprovedFactView["entityType"];
  payload: Record<string, unknown>;
}): ApprovedFactView {
  return Object.freeze({
    id: over.id ?? `f-${Math.random().toString(36).slice(2)}`,
    workspaceId: "ws",
    clientId: null,
    entityType: over.entityType,
    displayName: over.displayName ?? "x",
    payload: Object.freeze(over.payload),
    verificationState: over.verificationState ?? "approved",
    confidenceAtReview: over.confidenceAtReview ?? 0.9,
    lastReviewedAt: over.lastReviewedAt ?? "2026-06-17T00:00:00.000Z",
    sourceCount: over.sourceCount ?? 1,
    firstSnippet: over.firstSnippet ?? null,
    firstSourceId: over.firstSourceId ?? null,
  });
}

describe("BB→ASC selectors — Step 3 caller reasons", () => {
  it("turns faq into addCallerReason with opener from answer", () => {
    const out = buildCallerReasonSuggestions([
      fact({
        entityType: "faq",
        payload: { question: "Do you accept walk-ins?", answer: "Yes, between 9 and 5." },
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].step).toBe(3);
    expect(out[0].apply).toMatchObject({
      kind: "addCallerReason",
      label: "Do you accept walk-ins",
      opener: "Yes, between 9 and 5.",
    });
  });

  it("ranks faq above service and caps at 5", () => {
    const facts: ApprovedFactView[] = [];
    for (let i = 0; i < 8; i++) {
      facts.push(
        fact({
          entityType: "service",
          payload: { name: `Service ${i}` },
        }),
      );
    }
    for (let i = 0; i < 3; i++) {
      facts.push(
        fact({
          entityType: "faq",
          payload: { question: `FAQ ${i}?`, answer: "answer" },
        }),
      );
    }
    const out = buildCallerReasonSuggestions(facts);
    expect(out).toHaveLength(BB_SUGGESTION_CAP_PER_STEP);
    // First three should be FAQs (relevance 100 > 70).
    expect(out.slice(0, 3).every((s) => s.entityType === "faq")).toBe(true);
  });

  it("suppresses duplicates already present on the draft", () => {
    const out = buildCallerReasonSuggestions(
      [
        fact({
          entityType: "faq",
          payload: { question: "Pricing?", answer: "$10" },
        }),
      ],
      { existingCallerReasonLabels: ["Pricing"] },
    );
    expect(out).toHaveLength(0);
  });
});

describe("BB→ASC selectors — Step 4 intake requirements", () => {
  it("returns empty when no caller reasons exist (no apply target)", () => {
    const out = buildIntakeRequirementSuggestions([
      fact({
        entityType: "intake_requirement",
        payload: { label: "New client intake", fields: ["name", "phone"] },
      }),
    ]);
    expect(out).toEqual([]);
  });

  it("emits appendRequiredCaptureToFirstReason when caller reason exists", () => {
    const out = buildIntakeRequirementSuggestions(
      [
        fact({
          entityType: "intake_requirement",
          payload: { label: "Intake basics", fields: ["name", "phone"] },
        }),
      ],
      { hasCallerReason: true },
    );
    expect(out).toHaveLength(1);
    expect(out[0].apply).toEqual({
      kind: "appendRequiredCaptureToFirstReason",
      fields: ["name", "phone"],
    });
  });
});

describe("BB→ASC selectors — Step 6 notifications", () => {
  it("escalation_contact ranks above hours", () => {
    const out = buildEscalationSuggestions([
      fact({
        entityType: "hours",
        payload: { label: "Front desk", schedule: "M–F 9–5" },
      }),
      fact({
        entityType: "escalation_contact",
        payload: {
          label: "On-call attorney",
          channel: "phone",
          value: "+15555550100",
        },
      }),
    ]);
    expect(out[0].entityType).toBe("escalation_contact");
    expect(out[0].apply).toMatchObject({
      kind: "addNotificationEdit",
      channel: "phone",
    });
  });
});

describe("BB→ASC selectors — Step 7 destinations", () => {
  it("phone → setDestinationDeepLink with tel: template", () => {
    const out = buildDestinationSuggestions([
      fact({
        entityType: "phone",
        payload: { label: "Main line", number: "(555) 010-9988" },
      }),
    ]);
    expect(out[0].apply).toEqual({
      kind: "setDestinationDeepLink",
      deepLinkTemplate: "tel:5550109988",
      notes: "Main line",
    });
  });

  it("destination_contact email → mailto: template", () => {
    const out = buildDestinationSuggestions([
      fact({
        entityType: "destination_contact",
        payload: { label: "Intake inbox", channel: "email", value: "intake@example.com" },
      }),
    ]);
    expect(out[0].apply).toMatchObject({
      kind: "setDestinationDeepLink",
      deepLinkTemplate: "mailto:intake@example.com",
    });
  });
});

describe("BB→ASC selectors — ranking", () => {
  it("breaks confidence ties by recency", () => {
    const out = buildCallerReasonSuggestions([
      fact({
        id: "older",
        entityType: "faq",
        payload: { question: "Older?", answer: "a" },
        confidenceAtReview: 0.9,
        lastReviewedAt: "2026-06-01T00:00:00.000Z",
      }),
      fact({
        id: "newer",
        entityType: "faq",
        payload: { question: "Newer?", answer: "a" },
        confidenceAtReview: 0.9,
        lastReviewedAt: "2026-06-17T00:00:00.000Z",
      }),
    ]);
    expect(out[0].factId).toBe("newer");
  });
});
