import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SessionHeader } from "@/components/call-runner/SessionHeader";
import { FlowPanel } from "@/components/call-runner/FlowPanel";
import { GuidePanel } from "@/components/call-runner/GuidePanel";
import { CopilotPanel } from "@/components/call-runner/CopilotPanel";
import type { CallSessionMeta, CallSessionState, CopilotResult } from "@/types/call-runner";
import type { CampaignFlowContent } from "@/types/campaign-flow";
import type { WorkspaceGuideContentV2 } from "@/types/workspace-guide";

const META: CallSessionMeta = {
  workspaceId: "ws-1",
  workspaceName: "Assureway",
  campaignId: "c-1",
  campaignName: "Main Reception",
  callId: "call-xyz12345",
  ani: "555-0100",
  startedAt: new Date(Date.now() - 65_000).toISOString(),
};

const SESSION: CallSessionState = {
  schemaVersion: 1,
  meta: META,
  currentStepId: "s2",
  completedStepIds: ["s1"],
  values: {},
  notes: "",
  updatedAt: new Date().toISOString(),
  finalized: false,
};

const FLOW: CampaignFlowContent = {
  schemaVersion: 1,
  steps: [
    {
      id: "s1",
      type: "information_display",
      title: "Greeting",
      order: 1,
      required: false,
      enabled: true,
      nextStepId: null,
      rules: [],
      config: { body: "Welcome" },
    },
    {
      id: "s2",
      type: "field_capture",
      title: "Caller name",
      order: 2,
      required: true,
      enabled: true,
      nextStepId: null,
      rules: [],
      config: { fieldKey: "caller_name", fieldType: "short_text", helper: "Caller's full name" },
    },
    {
      id: "s3",
      type: "outcome_disposition",
      title: "Disposition",
      order: 3,
      required: true,
      enabled: true,
      nextStepId: null,
      rules: [],
      config: { allowedOutcomes: [{ code: "closed", label: "Closed" }] },
    },
  ],
  mappings: [],
};

const GUIDE: WorkspaceGuideContentV2 = {
  schemaVersion: 2,
  sections: [
    {
      id: "g1",
      kind: "greeting",
      label: "Greeting",
      visibility: "agent",
      required: false,
      enabled: true,
      fields: [{ id: "f1", label: "Opener", value: "Hi, thanks for calling." }],
    },
    {
      id: "g2",
      kind: "hours",
      label: "Hours",
      visibility: "agent",
      required: false,
      enabled: true,
      fields: [{ id: "f1", label: "Weekdays", value: "9-5" }],
    },
  ],
};

const EMPTY_COPILOT: CopilotResult = { suggestions: [], empty: true };

function renderWithTooltip(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("LiveCallRunner UX overhaul", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("header surfaces workspace, campaign, ANI, elapsed timer, step position, autosave", () => {
    renderWithTooltip(
      <SessionHeader
        meta={META}
        resumed={false}
        onReset={vi.fn()}
        branchLabel={null}
        stepPosition={{ current: 2, total: 3 }}
        requiredRemaining={1}
        autosave="saved"
        autosaveSavedAt={new Date().toISOString()}
      />,
    );
    const header = screen.getByTestId("runner-session-header");
    const w = within(header);
    expect(w.getByText("Assureway")).toBeInTheDocument();
    expect(w.getByText("Main Reception")).toBeInTheDocument();
    expect(w.getByText(/ANI 555-0100/)).toBeInTheDocument();
    expect(w.getByTestId("runner-elapsed")).toBeInTheDocument();
    expect(w.getByTestId("runner-step-position")).toHaveTextContent("Step 2 of 3");
    expect(w.getByTestId("runner-required-remaining-header")).toHaveTextContent("1 required");
    expect(w.getByText(/Saved/)).toBeInTheDocument();
    expect(w.getByRole("button", { name: /reset session/i })).toBeInTheDocument();
  });

  it("flow active step gets dominant emphasis via data-active and shows step-type label", () => {
    renderWithTooltip(
      <FlowPanel
        flow={FLOW}
        isLoading={false}
        session={SESSION}
        onValueChange={vi.fn()}
        onCurrentStep={vi.fn()}
        onCompleted={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const active = screen.getByTestId("runner-current-step-s2");
    expect(active.getAttribute("data-active")).toBe("true");
    expect(within(active).getByText("Capture")).toBeInTheDocument();
    expect(screen.getByTestId("runner-progress-rail")).toBeInTheDocument();
    // Submit button is sticky in the action row.
    expect(screen.getByTestId("runner-submit")).toBeInTheDocument();
  });

  it("flow renders the empty-published-flow state", () => {
    renderWithTooltip(
      <FlowPanel
        flow={null}
        isLoading={false}
        session={SESSION}
        onValueChange={vi.fn()}
        onCurrentStep={vi.fn()}
        onCompleted={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("runner-flow-empty")).toBeInTheDocument();
  });

  it("flow renders the loading state", () => {
    renderWithTooltip(
      <FlowPanel
        flow={null}
        isLoading={true}
        session={SESSION}
        onValueChange={vi.fn()}
        onCurrentStep={vi.fn()}
        onCompleted={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("runner-flow-loading")).toBeInTheDocument();
  });

  it("flow shows deferred submission state inline", () => {
    renderWithTooltip(
      <FlowPanel
        flow={FLOW}
        isLoading={false}
        session={{ ...SESSION, currentStepId: null, completedStepIds: ["s1", "s2", "s3"] }}
        onValueChange={vi.fn()}
        onCurrentStep={vi.fn()}
        onCompleted={vi.fn()}
        onSubmit={vi.fn()}
        submissionState="deferred"
      />,
    );
    expect(screen.getByTestId("runner-submission-deferred")).toBeInTheDocument();
  });

  it("guide renders loading skeleton then empty state when no guide", () => {
    const { rerender } = renderWithTooltip(
      <GuidePanel guide={null} isLoading={true} />,
    );
    expect(screen.getByTestId("runner-guide-loading")).toBeInTheDocument();
    rerender(
      <TooltipProvider>
        <GuidePanel guide={null} isLoading={false} />
      </TooltipProvider>,
    );
    expect(screen.getByTestId("runner-guide-empty")).toBeInTheDocument();
  });

  it("guide highlights the section relevant to the current step type", () => {
    renderWithTooltip(
      <GuidePanel
        guide={GUIDE}
        isLoading={false}
        currentStepHint={{ type: "information_display", title: "Greeting" }}
      />,
    );
    const pin = screen.getByTestId("runner-guide-relevant");
    expect(within(pin).getByText("Greeting")).toBeInTheDocument();
  });

  it("copilot empty state renders when copilot is listening", () => {
    renderWithTooltip(
      <CopilotPanel
        copilot={EMPTY_COPILOT}
        feedback={{}}
        onRate={vi.fn()}
        notes=""
        onNotesChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("copilot-empty")).toBeInTheDocument();
    // Notes textarea always present.
    expect(screen.getByTestId("runner-notes")).toBeInTheDocument();
  });

  it("copilot renders grouped suggestion with copy/insert/rate controls", () => {
    const copilot: CopilotResult = {
      empty: false,
      suggestions: [
        {
          id: "sug_1",
          kind: "suggested_answer",
          title: "Read this verbatim",
          body: "Hi, thanks for calling Assureway.",
          source: "From workspace guide",
        },
      ],
    };
    renderWithTooltip(
      <CopilotPanel
        copilot={copilot}
        feedback={{}}
        onRate={vi.fn()}
        notes=""
        onNotesChange={vi.fn()}
        onInsertIntoNotes={vi.fn()}
      />,
    );
    const card = screen.getByTestId("copilot-suggestion-suggested_answer");
    expect(within(card).getByLabelText(/copy suggestion to clipboard/i)).toBeInTheDocument();
    expect(within(card).getByLabelText(/insert suggestion into call notes/i)).toBeInTheDocument();
    expect(within(card).getByLabelText(/mark helpful/i)).toBeInTheDocument();
    expect(within(card).getByLabelText(/mark not helpful/i)).toBeInTheDocument();
  });
});
