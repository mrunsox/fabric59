/**
 * ASC Telemetry — handoff events fire once per mount (Phase 6 · Slice 2).
 *
 * Mounts AscOriginPanel under a spy emitter and asserts that
 * canonical_from_asc_opened fires exactly once per draft id, with the
 * expected payload shape.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1" },
    organization: { id: "org-7", integration_configs: {} },
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { AscOriginPanel } from "@/components/campaigns/AscOriginPanel";
import {
  __setAscTelemetryEmitter,
} from "@/lib/asc/telemetry";
import type { CampaignIntakeData } from "@/types/campaign";

const origin: NonNullable<CampaignIntakeData["ascOrigin"]> = {
  ascDraftId: "asc-handoff-1",
  forkedAt: "2026-06-17T00:00:00.000Z",
  carried: { primaryOutcome: "Book service", callerReasons: [] },
  followUps: [],
  reviewState: { followUpsDismissedIds: [] },
};

describe("ASC handoff events fire", () => {
  const spy = vi.fn();

  beforeEach(() => {
    spy.mockReset();
    __setAscTelemetryEmitter((eventType, payload, orgId, source) =>
      spy({ eventType, payload, orgId, source }),
    );
  });

  it("fires canonical_from_asc_opened exactly once on mount", () => {
    const { rerender } = render(
      <AscOriginPanel
        workspaceId="ws-1"
        ascOrigin={origin}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    const openCalls = spy.mock.calls.filter(
      (c) => c[0].eventType === "canonical_from_asc_opened",
    );
    expect(openCalls).toHaveLength(1);
    expect(openCalls[0][0].payload).toMatchObject({
      ascDraftId: "asc-handoff-1",
      workspaceId: "ws-1",
      organizationId: "org-7",
    });
    expect(openCalls[0][0].source).toBe("canonical");

    // Rerender with same draft id — must not fire again.
    rerender(
      <AscOriginPanel
        workspaceId="ws-1"
        ascOrigin={{ ...origin }}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    const stillOnce = spy.mock.calls.filter(
      (c) => c[0].eventType === "canonical_from_asc_opened",
    );
    expect(stillOnce).toHaveLength(1);
  });

  it("re-fires when the draft id changes", () => {
    const { rerender } = render(
      <AscOriginPanel
        workspaceId="ws-1"
        ascOrigin={origin}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    rerender(
      <AscOriginPanel
        workspaceId="ws-1"
        ascOrigin={{ ...origin, ascDraftId: "asc-handoff-2" }}
        existingNewDispositions={[]}
        onUpdateAscOrigin={() => {}}
        onAddNewDispositions={() => {}}
      />,
    );
    const openCalls = spy.mock.calls.filter(
      (c) => c[0].eventType === "canonical_from_asc_opened",
    );
    expect(openCalls).toHaveLength(2);
    expect(openCalls.map((c) => c[0].payload.ascDraftId)).toEqual([
      "asc-handoff-1",
      "asc-handoff-2",
    ]);
  });
});
