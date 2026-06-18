/**
 * Phase 2 — BbSuggestionTray UI invariants.
 *
 * Verifies that:
 *   - rendering the tray does NOT call onApply,
 *   - clicking "Use" calls onApply exactly once with the suggestion's intent,
 *   - clicking dismiss removes the card without dispatching,
 *   - in read-only mode the tray emits the hidden-forked event and renders
 *     nothing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BbSuggestionTray } from "@/components/asc/BbSuggestionTray";
import { __setBbTelemetryEmitter } from "@/lib/business-brain/telemetry";
import type { BbAscSuggestion } from "@/lib/business-brain/selectors";

function sug(over: Partial<BbAscSuggestion> = {}): BbAscSuggestion {
  return {
    id: over.id ?? "3:f-1",
    step: over.step ?? 3,
    factId: over.factId ?? "f-1",
    entityType: over.entityType ?? "faq",
    title: over.title ?? "Pricing question",
    snippet: over.snippet ?? "We charge $X.",
    confidence: 0.9,
    confidenceBand: "high",
    relevance: 100,
    lastReviewedAt: "2026-06-17T00:00:00.000Z",
    sourceCount: 2,
    apply: over.apply ?? {
      kind: "addCallerReason",
      label: "Pricing question",
    },
  };
}

describe("BbSuggestionTray", () => {
  beforeEach(() => __setBbTelemetryEmitter(() => {}));

  it("renders cards without invoking onApply", () => {
    const onApply = vi.fn();
    render(
      <BbSuggestionTray
        workspaceId="ws"
        ascDraftId="d"
        organizationId="o"
        step={3}
        isReadOnly={false}
        suggestions={[sug(), sug({ id: "3:f-2", factId: "f-2", title: "Hours?" })]}
        onApply={onApply}
      />,
    );
    expect(screen.getAllByTestId("bb-suggestion-card")).toHaveLength(2);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("Use button calls onApply with the suggestion's intent exactly once", () => {
    const onApply = vi.fn();
    const intent = { kind: "addCallerReason" as const, label: "X" };
    render(
      <BbSuggestionTray
        workspaceId="ws"
        ascDraftId="d"
        organizationId="o"
        step={3}
        isReadOnly={false}
        suggestions={[sug({ apply: intent })]}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByTestId("bb-suggestion-use"));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual(intent);
  });

  it("Dismiss removes the card without calling onApply", () => {
    const onApply = vi.fn();
    render(
      <BbSuggestionTray
        workspaceId="ws"
        ascDraftId="d"
        organizationId="o"
        step={3}
        isReadOnly={false}
        suggestions={[sug()]}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByLabelText("Dismiss suggestion"));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByTestId("bb-suggestion-card")).toBeNull();
  });

  it("renders nothing in read-only mode and emits the hidden-forked event", () => {
    const events: string[] = [];
    __setBbTelemetryEmitter((eventType) => {
      events.push(eventType);
    });
    const { container } = render(
      <BbSuggestionTray
        workspaceId="ws"
        ascDraftId="d"
        organizationId="o"
        step={3}
        isReadOnly={true}
        suggestions={[sug()]}
        onApply={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(events).toContain("bb_asc_suggestion_hidden_forked");
  });
});
