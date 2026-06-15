import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExternalResourcesPanel } from "@/components/external-resources/ExternalResourcesPanel";
import { normalizeExternalResources } from "@/lib/external-resources/normalize";
import { evaluateResources } from "@/lib/external-resources/evaluateResources";
import type { ResourceEvaluationContext, ResourceEvent } from "@/lib/external-resources/types";

const baseCtx: ResourceEvaluationContext = { embedMode: "internal" };

function build(extra?: Parameters<typeof normalizeExternalResources>[0]) {
  const cfg = normalizeExternalResources(
    extra ?? {
      resources: [
        { id: "calA", label: "Book a slot", kind: "calendar", url: "https://book.test/x" },
        { id: "siteA", label: "Client site", kind: "website", url: "https://client.test" },
        { id: "portalA", label: "Member portal", kind: "portal", url: "https://portal.test" },
      ],
      rules: [],
    },
  );
  return evaluateResources(cfg, baseCtx);
}

describe("ExternalResourcesPanel UI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders empty state when result is null", () => {
    render(<ExternalResourcesPanel result={null} context={baseCtx} />);
    expect(screen.getByTestId("external-resources-empty")).toBeInTheDocument();
  });

  it("renders ranked resources and buckets", () => {
    render(<ExternalResourcesPanel result={build()} context={baseCtx} />);
    expect(screen.getByTestId("external-resources-panel")).toBeInTheDocument();
    expect(screen.getByText("Book a slot")).toBeInTheDocument();
    expect(screen.getByText("Client site")).toBeInTheDocument();
    expect(screen.getByText("Member portal")).toBeInTheDocument();
  });

  it("renders booking actions for calendar resources only", () => {
    render(<ExternalResourcesPanel result={build()} context={baseCtx} />);
    const bookingBlocks = screen.getAllByTestId("booking-actions");
    expect(bookingBlocks).toHaveLength(1);
    expect(bookingBlocks[0].getAttribute("data-resource-id")).toBe("calA");
  });

  it("emits booking_completed and inserts a note when agent marks booked", () => {
    const onEvent = vi.fn();
    const onAppendToNotes = vi.fn();
    render(
      <ExternalResourcesPanel
        result={build()}
        context={baseCtx}
        onEvent={onEvent}
        onAppendToNotes={onAppendToNotes}
      />,
    );
    fireEvent.click(screen.getByText("Mark booked"));
    const kinds = onEvent.mock.calls.map((c) => (c[0] as ResourceEvent).kind);
    expect(kinds).toContain("booking_completed");
    expect(onAppendToNotes).toHaveBeenCalled();
  });

  it("fires onSurfaced for visible resources", () => {
    const onSurfaced = vi.fn();
    render(
      <ExternalResourcesPanel result={build()} context={baseCtx} onSurfaced={onSurfaced} />,
    );
    expect(onSurfaced).toHaveBeenCalled();
    const passed = onSurfaced.mock.calls[0][0] as { resource: { id: string } }[];
    expect(passed.map((p) => p.resource.id).sort()).toEqual(["calA", "portalA", "siteA"]);
  });

  it("shows auto-open banner only when a candidate is present", () => {
    const cfg = normalizeExternalResources({
      resources: [
        { id: "calA", label: "Book a slot", kind: "calendar", url: "https://book.test", openMode: "drawer" },
      ],
      rules: [
        { id: "ao", name: "Auto", priority: 100, when: { combinator: "all", conditions: [] }, then: { kind: "auto_open_if_safe", targetId: "calA" } },
      ],
    });
    const result = evaluateResources(cfg, baseCtx);
    render(<ExternalResourcesPanel result={result} context={baseCtx} />);
    expect(screen.getByTestId("auto-open-banner")).toBeInTheDocument();
  });
});
