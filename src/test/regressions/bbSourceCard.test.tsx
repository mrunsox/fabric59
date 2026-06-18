/**
 * BbSourceCard — render + interaction tests.
 *
 * Validates that the card surfaces the right primary content, the
 * confidence band, the review badge, and that ThumbsUp/ThumbsDown emit
 * the privacy-safe `bb_search_result_marked` telemetry event.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/business-brain/telemetry", () => ({
  emitBbEvent: vi.fn(),
}));

import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { BbSourceCard } from "@/components/business-brain/BbSourceCard";
import type { BbSearchCard } from "@/lib/business-brain/selectors";

function makeFactCard(overrides: Partial<BbSearchCard> = {}): BbSearchCard {
  return {
    kind: "fact",
    id: "f1",
    entityType: "faq",
    title: "When do you open?",
    snippet: "We open at 9 AM Mon-Fri.",
    evidence: [
      {
        sourceId: "s1",
        sourceTitle: "Hours doc",
        sourceKind: "upload_doc",
        snippet: "Office hours are 9-5.",
      },
    ],
    score: 0.92,
    confidence: 0.9,
    confidenceBand: "high",
    verificationState: "approved",
    lastReviewedAt: "2026-06-01T00:00:00Z",
    factId: "f1",
    ...overrides,
  };
}

describe("BbSourceCard", () => {
  beforeEach(() => {
    (emitBbEvent as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it("renders title, snippet, entity-type chip, confidence band, and approved badge", () => {
    render(
      <BbSourceCard
        card={makeFactCard()}
        workspaceId="w1"
        organizationId="o1"
        rank={0}
      />,
    );
    expect(screen.getByText("When do you open?")).toBeTruthy();
    expect(screen.getByText(/We open at 9 AM/)).toBeTruthy();
    expect(screen.getByText("faq")).toBeTruthy();
    expect(screen.getByText("high")).toBeTruthy();
    expect(screen.getByText(/Approved/)).toBeTruthy();
    expect(screen.getByText(/Hours doc/)).toBeTruthy();
  });

  it("emits bb_search_result_marked on ThumbsUp/ThumbsDown", () => {
    render(
      <BbSourceCard
        card={makeFactCard()}
        workspaceId="w1"
        organizationId="o1"
        rank={2}
      />,
    );
    fireEvent.click(screen.getByLabelText("Mark useful"));
    fireEvent.click(screen.getByLabelText("Mark not useful"));
    const calls = (emitBbEvent as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("bb_search_result_marked");
    expect(calls[0][1].useful).toBe(true);
    expect(calls[0][1].rank).toBe(2);
    expect(calls[0][1].hitKind).toBe("fact");
    expect(calls[1][1].useful).toBe(false);
  });

  it("never leaks raw query text into telemetry payloads (smoke check)", () => {
    render(
      <BbSourceCard
        card={makeFactCard()}
        workspaceId="w1"
        organizationId="o1"
        rank={0}
      />,
    );
    fireEvent.click(screen.getByLabelText("Mark useful"));
    const payload = (emitBbEvent as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.snippet).toBeUndefined();
    expect(payload.title).toBeUndefined();
    expect(payload.query).toBeUndefined();
  });

  it("renders 'Evidence' chip and source kind for orphan chunk cards", () => {
    render(
      <BbSourceCard
        card={makeFactCard({
          kind: "chunk",
          entityType: null,
          confidence: null,
          confidenceBand: null,
          verificationState: null,
          factId: null,
        })}
        workspaceId="w1"
        organizationId="o1"
      />,
    );
    expect(screen.getByText("Evidence")).toBeTruthy();
    expect(screen.queryByText(/Approved/)).toBeNull();
  });
});
