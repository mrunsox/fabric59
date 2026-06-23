/**
 * Phase 7B — CallSessionReplay component regression.
 *
 * Validates that the replay renders the snapshot's header, timeline, outcome,
 * and knowledge bin slice, and that the empty-snapshot state is honest.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CallSessionSnapshotV1 } from "@/lib/workspace/callSessions/snapshotContract";

// Mock the snapshot loader and AI summaries so we drive the UI from fixtures.
vi.mock("@/lib/workspace/callSessions/snapshots", () => ({
  getLatestSnapshotForSession: vi.fn(),
}));
vi.mock("@/lib/workspace/callSessions/aiSummaries", () => ({
  summarizeCallFromSnapshot: vi.fn(async () => ({
    summary: "Mock summary of the call.",
    tags: ["billing", "scheduling"],
    generated_from: { version: 1, captured_at: "2026-06-23T10:05:00Z" },
  })),
  suggestQaChecksFromSnapshot: vi.fn(async () => ({
    hints: ["Verify caller identity"],
  })),
}));

import { getLatestSnapshotForSession } from "@/lib/workspace/callSessions/snapshots";
import { CallSessionReplay } from "@/components/workspace/calls/CallSessionReplay";

const baseSnapshot: CallSessionSnapshotV1 = {
  session: {
    id: "sess-1",
    workspace_id: "ws-1",
    campaign_id: "camp-1",
    agent_id: "agent-1",
    status: "completed",
    phase: "completed",
    started_at: "2026-06-23T10:00:00Z",
    ended_at: "2026-06-23T10:04:00Z",
    duration_seconds: 240,
    ani: "5551230001",
    caller_label: { value: "Casey Chen", source: "brain" },
  },
  knowledge_bin: {
    captured_at: "2026-06-23T10:05:00Z",
    groups: [
      {
        key: "approved",
        precedence: 4,
        items: [
          {
            id: "b1",
            source_type: "business_brain",
            source_id: "f1",
            label: "Policy",
            body: "",
            scope: "Approved",
            approval_state: "approved",
            topic_key: "bb_policy",
          },
        ],
      },
    ],
  },
  events: [
    { ts: "2026-06-23T10:01:00Z", type: "phase_change", from: "live", to: "wrap_up" },
    {
      ts: "2026-06-23T10:02:00Z",
      type: "disposition_selected",
      disposition_id: "d1",
      label: "Booked",
    },
  ],
  outcome: { disposition_id: "d1", disposition_label: "Booked", notes_excerpt: "Customer rebooked." },
  ai_assist: { used_suggestions: [] },
};

function renderReplay(opts: { showQaHints?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CallSessionReplay sessionId="sess-1" showQaHints={opts.showQaHints} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Phase 7B — CallSessionReplay", () => {
  it("renders header, timeline, outcome, and knowledge bin from snapshot", async () => {
    (getLatestSnapshotForSession as any).mockResolvedValue({
      id: "snap-1",
      call_session_id: "sess-1",
      workspace_id: "ws-1",
      campaign_id: "camp-1",
      version: 1,
      source: "system",
      snapshot: baseSnapshot,
      metadata: {},
      created_at: "2026-06-23T10:05:00Z",
    });
    renderReplay();
    await waitFor(() => expect(screen.getByTestId("replay-root")).toBeInTheDocument());
    expect(screen.getByText("Casey Chen")).toBeInTheDocument();
    expect(screen.getByTestId("replay-timeline")).toBeInTheDocument();
    expect(screen.getAllByText(/Booked/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("replay-kb")).toBeInTheDocument();
  });

  it("shows an honest empty state when no snapshot exists", async () => {
    (getLatestSnapshotForSession as any).mockResolvedValue(null);
    renderReplay();
    await waitFor(() => expect(screen.getByTestId("replay-empty")).toBeInTheDocument());
    expect(screen.getByText(/No snapshot captured/i)).toBeInTheDocument();
  });

  it("renders QA Hints panel only when enabled, with advisory label", async () => {
    (getLatestSnapshotForSession as any).mockResolvedValue({
      id: "snap-1",
      call_session_id: "sess-1",
      workspace_id: "ws-1",
      campaign_id: null,
      version: 1,
      source: "system",
      snapshot: baseSnapshot,
      metadata: {},
      created_at: "2026-06-23T10:05:00Z",
    });
    renderReplay({ showQaHints: true });
    await waitFor(() => expect(screen.getByTestId("replay-qa-hints")).toBeInTheDocument());
    expect(screen.getByText(/Advisory only/i)).toBeInTheDocument();
  });
});
