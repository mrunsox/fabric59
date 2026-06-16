import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { CallerHistoryPanel } from "@/components/call-runner/CallerHistoryPanel";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe("CallerHistoryPanel", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renders nothing when no ANI is provided", () => {
    const { container } = render(<CallerHistoryPanel ani={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows loading then list when items return", async () => {
    invokeMock.mockResolvedValue({
      data: {
        items: [
          {
            id: "1",
            source: "internal",
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 125,
            disposition: "Transferred",
            agent_name: "J. Doe",
            script_name: "Inbound Sales",
            summary: "Caller asked about pricing.",
          },
        ],
      },
      error: null,
    });
    render(<CallerHistoryPanel ani="+15555550123" />);
    expect(screen.getByTestId("caller-history-loading")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("caller-history-item")).toBeInTheDocument(),
    );
    expect(screen.getByText("Transferred")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("caller-history", {
      body: { ani: "+15555550123", limit: 10 },
    });
  });

  it("shows empty-state copy when items array is empty", async () => {
    invokeMock.mockResolvedValue({ data: { items: [] }, error: null });
    render(<CallerHistoryPanel ani="5551234567" />);
    await waitFor(() =>
      expect(screen.getByTestId("caller-history-empty")).toBeInTheDocument(),
    );
  });
});
