import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransferDirectoryPanel } from "@/components/transfer-directory/TransferDirectoryPanel";
import { evaluateTransferRules } from "@/lib/transfer-directory/evaluateRules";
import { normalizeTransferDirectory } from "@/lib/transfer-directory/normalize";

describe("TransferDirectoryPanel UI", () => {
  it("renders empty hint when no result is provided", () => {
    render(<TransferDirectoryPanel result={null} />);
    expect(screen.getByTestId("transfer-directory-empty")).toBeInTheDocument();
  });

  it("renders single-allowed banner when only one target matches", () => {
    const config = normalizeTransferDirectory({
      entries: [
        { id: "a", displayName: "Alpha" },
        { id: "b", displayName: "Bravo" },
      ],
      rules: [
        {
          id: "inc",
          name: "Only A",
          then: { kind: "include", targetIds: ["a"] },
          when: { combinator: "all", conditions: [] },
        },
      ],
    });
    const result = evaluateTransferRules(config, {});
    render(<TransferDirectoryPanel result={result} />);
    expect(screen.getByTestId("single-allowed-banner")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders instructions-only terminal state", () => {
    const config = normalizeTransferDirectory({
      entries: [{ id: "a", displayName: "Alpha" }],
      rules: [
        {
          id: "block",
          name: "Block",
          then: { kind: "instructions_only", message: "Follow escalation script." },
          when: { combinator: "all", conditions: [] },
        },
      ],
    });
    const result = evaluateTransferRules(config, {});
    render(<TransferDirectoryPanel result={result} />);
    expect(screen.getByTestId("transfer-directory-instructions")).toBeInTheDocument();
    expect(screen.getByText("Follow escalation script.")).toBeInTheDocument();
  });

  it("groups targets by bucket", () => {
    const config = normalizeTransferDirectory({
      entries: [
        { id: "a", displayName: "Alpha" },
        { id: "b", displayName: "Bravo", fallback: true },
        { id: "c", displayName: "Charlie", escalationLevel: 1 },
      ],
      rules: [],
    });
    const result = evaluateTransferRules(config, {});
    render(<TransferDirectoryPanel result={result} />);
    expect(screen.getByTestId("bucket-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("bucket-escalation")).toBeInTheDocument();
  });
});
