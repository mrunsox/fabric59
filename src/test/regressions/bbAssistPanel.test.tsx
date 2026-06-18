/**
 * Phase 4 — runner invariants: the assist panel is read-only.
 *
 * Renders BbAssistPanel with spy callbacks and asserts:
 *   - Mounting alone does not call any mutator.
 *   - Insert/Copy only fire via explicit clicks on their respective buttons.
 *   - Insert is APPEND-only and clearly attributable to Business Brain.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BbAssistPanel } from "@/components/call-runner/BbAssistPanel";
import type { BbAssistCard } from "@/lib/business-brain/assistRanker";

const card: BbAssistCard = {
  id: "assist:f1",
  kind: "intent_hint",
  factId: "f1",
  entityType: "faq",
  title: "Why are you calling?",
  action: "Answer: see source",
  snippet: "We offer free consults.",
  confidence: 0.9,
  confidenceBand: "high",
  verificationState: "approved",
  lastReviewedAt: "2026-06-01T00:00:00Z",
  score: 100000,
  sourceIds: ["src-1"],
};

describe("BbAssistPanel — read-only invariants", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("does not call onInsertIntoNotes or onRefresh on mount", () => {
    const onInsert = vi.fn();
    const onRefresh = vi.fn();
    render(
      <BbAssistPanel
        enabled
        isLoading={false}
        cards={[card]}
        isEmpty={false}
        workspaceId="ws1"
        campaignId="c1"
        organizationId="org1"
        stepKind="intent"
        onRefresh={onRefresh}
        onInsertIntoNotes={onInsert}
        lastRefreshedAt={null}
      />,
    );
    expect(onInsert).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("appends a clearly-attributed line only when Insert is clicked", () => {
    const onInsert = vi.fn();
    render(
      <BbAssistPanel
        enabled
        isLoading={false}
        cards={[card]}
        isEmpty={false}
        workspaceId="ws1"
        campaignId="c1"
        organizationId="org1"
        stepKind="intent"
        onRefresh={() => {}}
        onInsertIntoNotes={onInsert}
        lastRefreshedAt={null}
      />,
    );
    // Expand the card first
    fireEvent.click(screen.getByText("Why are you calling?"));
    fireEvent.click(screen.getByLabelText("Insert into notes"));
    expect(onInsert).toHaveBeenCalledTimes(1);
    const text = onInsert.mock.calls[0][0] as string;
    expect(text).toMatch(/\[Business Brain · /);
    expect(text).toContain("Why are you calling?");
  });

  it("renders nothing when disabled", () => {
    const { container } = render(
      <BbAssistPanel
        enabled={false}
        isLoading={false}
        cards={[card]}
        isEmpty={false}
        workspaceId="ws1"
        campaignId="c1"
        organizationId="org1"
        stepKind="intent"
        onRefresh={() => {}}
        onInsertIntoNotes={() => {}}
        lastRefreshedAt={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders empty-state with deep link to Business Brain when no cards", () => {
    render(
      <BbAssistPanel
        enabled
        isLoading={false}
        cards={[]}
        isEmpty
        workspaceId="ws1"
        campaignId="c1"
        organizationId="org1"
        stepKind="intent"
        onRefresh={() => {}}
        onInsertIntoNotes={() => {}}
        lastRefreshedAt={null}
      />,
    );
    const link = screen.getByRole("link", { name: /Open Business Brain/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/w/ws1/brain/approved");
  });
});
