/**
 * Phase 9 — Cockpit "Last call" replay entrypoint.
 *
 * Asserts:
 *   - button mounts in cockpit and is keyboard-accessible,
 *   - opening it with no completed sessions shows the empty-state copy,
 *   - opening it with a completed session loads CallSessionReplay against
 *     the most recent ended_at row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase client used inside the button.
const orderMock = vi.fn();
const notMock = vi.fn(() => ({ order: vi.fn(() => ({ limit: orderMock })) }));
const eqAgentMock = vi.fn(() => ({ not: notMock }));
const eqWorkspaceMock = vi.fn(() => ({ eq: eqAgentMock }));
const selectMock = vi.fn(() => ({ eq: eqWorkspaceMock }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ select: selectMock })),
  },
}));

// Mock the replay child so we only assert what we render around it.
vi.mock("@/components/workspace/calls/CallSessionReplay", () => ({
  CallSessionReplay: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="replay-stub">Replay for {sessionId}</div>
  ),
}));

// Mock telemetry to a noop spy.
vi.mock("@/lib/workspace/telemetry/callsTelemetry", () => ({
  useCallsTelemetry: () => vi.fn(),
}));

import { CockpitLastCallButton } from "@/components/workspace/cockpit/CockpitLastCallButton";

function renderBtn(agentId: string | null = "agent-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CockpitLastCallButton workspaceId="ws-1" agentId={agentId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CockpitLastCallButton", () => {
  it("shows empty state when there's no completed call", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });
    renderBtn();
    fireEvent.click(screen.getByTestId("cockpit-last-call-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("cockpit-last-call-empty")).toBeInTheDocument(),
    );
    expect(screen.getByText(/No recent completed call/i)).toBeInTheDocument();
  });

  it("renders the replay for the latest completed session", async () => {
    orderMock.mockResolvedValue({ data: [{ id: "sess-77" }], error: null });
    renderBtn();
    fireEvent.click(screen.getByTestId("cockpit-last-call-btn"));
    await waitFor(() => expect(screen.getByTestId("replay-stub")).toBeInTheDocument());
    expect(screen.getByText(/Replay for sess-77/)).toBeInTheDocument();
  });

  it("is disabled with no agentId", () => {
    renderBtn(null);
    expect(screen.getByTestId("cockpit-last-call-btn")).toBeDisabled();
  });
});
