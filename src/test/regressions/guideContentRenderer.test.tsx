import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuideContentRenderer } from "@/components/guides/GuideContentRenderer";
import type { GuideContentV1 } from "@/types/guide-content";

const sample: GuideContentV1 = {
  schemaVersion: 1,
  blocks: [
    { id: "1", type: "heading", text: "Welcome" },
    { id: "2", type: "paragraph", text: "About Acme." },
    { id: "3", type: "info", text: "Hours: 9-5" },
    { id: "4", type: "script", text: "Thanks for calling Acme." },
    { id: "5", type: "connector", label: "Client portal", href: "https://portal.test/" },
  ],
};

describe("GuideContentRenderer", () => {
  it("renders all five block variants", () => {
    render(<GuideContentRenderer content={sample} />);
    expect(screen.getByText("Welcome").tagName).toBe("H3");
    expect(screen.getByText("About Acme.")).toBeInTheDocument();
    expect(screen.getByText("Hours: 9-5")).toBeInTheDocument();
    expect(screen.getByText("Thanks for calling Acme.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /client portal/i });
    expect(link).toHaveAttribute("href", "https://portal.test/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to href when connector label is blank", () => {
    render(
      <GuideContentRenderer
        content={{
          schemaVersion: 1,
          blocks: [{ id: "1", type: "connector", label: "  ", href: "https://x.test/" }],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /https:\/\/x\.test/ })).toBeInTheDocument();
  });

  it("shows empty state when blocks are empty", () => {
    render(<GuideContentRenderer content={{ schemaVersion: 1, blocks: [] }} />);
    expect(screen.getByText(/no guide content/i)).toBeInTheDocument();
  });
});
