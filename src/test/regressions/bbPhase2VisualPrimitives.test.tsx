/**
 * Phase 2 Slice A — visual primitives regression tests.
 *
 * Asserts the structural contract of the new presentation primitives
 * without locking exact class names beyond the tonal recipe classes the
 * design system depends on. No behavior, no business logic.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  BrainPanel,
  BrainPageHeader,
  BrainStatCard,
  BrainBadge,
  BrainTabsBar,
  BrainTable,
} from "@/components/business-brain/ui";

describe("Phase 2 — Brain visual primitives", () => {
  it("BrainPanel renders tone as a data attribute and applies rail class for non-default tones", () => {
    const { getByTestId, rerender } = render(
      <BrainPanel data-testid="p" tone="ok">body</BrainPanel>,
    );
    const el = getByTestId("p");
    expect(el.getAttribute("data-bb-panel-tone")).toBe("ok");
    expect(el.className).toMatch(/bb-rail-ok/);
    expect(el.className).toMatch(/bb-panel|bb-card-raised/);

    rerender(<BrainPanel data-testid="p" tone="default">body</BrainPanel>);
    expect(getByTestId("p").className).not.toMatch(/bb-rail-/);
  });

  it("BrainPageHeader renders title, eyebrow, freshness chip when provided", () => {
    const { getByText, getByTestId, queryByTestId, rerender } = render(
      <BrainPageHeader
        title="Health"
        eyebrow="Business Brain"
        freshness="Updated 2m ago"
      />,
    );
    expect(getByText("Health")).toBeTruthy();
    expect(getByText("Business Brain")).toBeTruthy();
    expect(getByTestId("brain-freshness").textContent).toContain("Updated 2m ago");

    rerender(<BrainPageHeader title="Health" />);
    expect(queryByTestId("brain-freshness")).toBeNull();
  });

  it("BrainStatCard exposes state via data attribute and hides value when not ready", () => {
    const { getByTestId, rerender, queryByText } = render(
      <BrainStatCard data-testid="s" label="Facts" value={42} state="ready" />,
    );
    expect(getByTestId("s").getAttribute("data-bb-stat-state")).toBe("ready");
    expect(queryByText("42")).toBeTruthy();

    rerender(<BrainStatCard data-testid="s" label="Facts" value={42} state="noData" />);
    expect(getByTestId("s").getAttribute("data-bb-stat-state")).toBe("noData");
    expect(queryByText("42")).toBeNull();

    rerender(<BrainStatCard data-testid="s" label="Facts" value={42} state="failed" />);
    expect(getByTestId("s").getAttribute("data-bb-stat-state")).toBe("failed");
  });

  it("BrainStatCard does not render a sparkline slot when sparkline prop is omitted", () => {
    const { container } = render(
      <BrainStatCard label="Facts" value={42} state="ready" delta="+1" />,
    );
    // Sparkline container has a fixed min-width; ensure no such slot exists.
    expect(container.querySelector(".min-w-\\[64px\\]")).toBeNull();
  });

  it("BrainBadge applies the requested tonal recipe", () => {
    const { getByTestId } = render(
      <BrainBadge tone="warn" data-testid="b">stale</BrainBadge>,
    );
    const el = getByTestId("b");
    expect(el.getAttribute("data-bb-badge-tone")).toBe("warn");
    expect(el.className).toMatch(/bb-badge-warn/);
  });

  it("BrainTabsBar renders one link per tab with anchor role", () => {
    const { getAllByRole } = render(
      <MemoryRouter>
        <BrainTabsBar
          tabs={[
            { label: "Knowledge", to: "/a" },
            { label: "Governance", to: "/b" },
            { label: "Health", to: "/c" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(getAllByRole("link")).toHaveLength(3);
  });

  it("BrainTable exposes density via data attribute", () => {
    const { container } = render(
      <BrainTable density="sm">
        <thead><tr><th>Col</th></tr></thead>
        <tbody><tr><td>v</td></tr></tbody>
      </BrainTable>,
    );
    const table = container.querySelector("table");
    expect(table?.getAttribute("data-bb-table-density")).toBe("sm");
  });
});
