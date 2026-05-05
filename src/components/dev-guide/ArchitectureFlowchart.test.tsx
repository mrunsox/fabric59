import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchitectureFlowchart } from "./ArchitectureFlowchart";

const LANE_NAMES = [
  "Five9 event source",
  "Flow Template",
  "Configured Flow",
  "Deployment Scope",
  "Connector Layer",
  "Execution Run",
  "Target Outcomes",
];

const KEY_CHIPS = [
  "On Call Dispositioned",
  "Disposition Webhook",
  "Trigger",
  "Filters",
  "Mappings",
  "Action",
  "Failure Policy",
  "Workspace",
  "Five9 Domain",
  "Clio",
  "MyCase",
  "Smokeball",
  "Webhook",
  "Custom HTTP",
  "Request Payload",
  "Idempotency / External Record",
  "Create Matter / Case",
];

describe("ArchitectureFlowchart", () => {
  it("renders all seven layer names", () => {
    render(<ArchitectureFlowchart />);
    for (const name of LANE_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("renders FlowBuilder terminology and connector chips", () => {
    render(<ArchitectureFlowchart />);
    for (const chip of KEY_CHIPS) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  it("renders the fan-in caption between Connector and Execution lanes", () => {
    render(<ArchitectureFlowchart />);
    expect(
      screen.getByText("Deployment scope + Connector resolve at run time")
    ).toBeInTheDocument();
  });

  it("renders the legend strip", () => {
    const { container } = render(<ArchitectureFlowchart />);
    expect(container.textContent).toContain("directional flow");
    expect(container.textContent).toContain("entity / value");
    expect(container.textContent).toContain("system layer");
  });

  it("uses a fluid container without forcing a min-width (no horizontal scroll on narrow widths)", () => {
    const { container } = render(<ArchitectureFlowchart />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/min-w-\[/);
    expect(root.className).not.toMatch(/overflow-x-auto/);
  });
});
