import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { FlowPanel } from "@/components/call-runner/FlowPanel";
import type { CallSessionMeta, CallSessionState } from "@/types/call-runner";
import type { CampaignFlowContent } from "@/types/campaign-flow";

const META: CallSessionMeta = {
  workspaceId: "ws-1",
  workspaceName: "WS",
  campaignId: "c-1",
  campaignName: "Camp",
  callId: "c",
  ani: null,
  startedAt: new Date().toISOString(),
};

function buildLongFlow(n: number): CampaignFlowContent {
  return {
    schemaVersion: 1,
    steps: Array.from({ length: n }, (_, i) => ({
      id: `s${i + 1}`,
      type: "information_display" as const,
      title: `Step ${i + 1}`,
      order: i + 1,
      required: false,
      enabled: true,
      nextStepId: null,
      rules: [],
      config: { body: "x" },
    })),
    mappings: [],
  };
}

const SESSION: CallSessionState = {
  schemaVersion: 1,
  meta: META,
  currentStepId: "s1",
  completedStepIds: [],
  values: {},
  notes: "",
  updatedAt: new Date().toISOString(),
  finalized: false,
};

describe("Runner action bar position", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders Back/Next/Submit above the scrolling steps body", () => {
    render(
      <TooltipProvider>
        <FlowPanel
          flow={buildLongFlow(30)}
          isLoading={false}
          session={SESSION}
          onValueChange={vi.fn()}
          onCurrentStep={vi.fn()}
          onCompleted={vi.fn()}
          onSubmit={vi.fn()}
          submitting={false}
          submissionState="idle"
        />
      </TooltipProvider>,
    );
    const submit = screen.getByTestId("runner-submit");
    const next = screen.getByTestId("runner-next");
    const scrollBody = document.querySelector(".overflow-y-auto") as HTMLElement;
    expect(scrollBody).toBeTruthy();
    expect(
      submit.compareDocumentPosition(scrollBody) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      next.compareDocumentPosition(scrollBody) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
