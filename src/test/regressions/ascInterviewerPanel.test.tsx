/**
 * ASC Slice 3 — AscAssistantPanel + useAscInterviewer integration.
 *
 * Mocks supabase.functions.invoke to feed Interviewer responses into the
 * panel. Asserts that valid responses render question + chips, that
 * Confirm updates the draft through the reducer, that schema-invalid
 * responses surface a recoverable error without mutating the draft, and
 * that the panel persists across remount when meta.interviewer is hydrated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useReducer } from "react";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { AscAssistantPanel } from "@/components/asc/AscAssistantPanel";
import type { AscDraft } from "@/lib/asc/types";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

function Harness({
  step,
  initial,
}: {
  step: 1 | 2;
  initial?: AscDraft;
}) {
  const seed =
    initial ??
    createEmptyAscDraft({
      id: "d1",
      workspaceId: "ws-1",
      createdBy: "u-1",
      now: "2026-06-16T00:00:00.000Z",
    });
  const [draft, dispatch] = useReducer(ascReducer, seed);
  return (
    <div>
      <div data-testid="industry-value">{draft.input.business.industryPresetId}</div>
      <div data-testid="primary-outcome-value">{draft.input.purpose.primaryOutcome}</div>
      <div data-testid="secondary-outcome-value">
        {draft.input.purpose.secondaryOutcome ?? ""}
      </div>
      <AscAssistantPanel
        draft={draft}
        step={step}
        dispatch={dispatch}
        workspaceId="ws-1"
      />
    </div>
  );
}

function mountPanel(step: 1 | 2, initial?: AscDraft) {
  return render(
    <MemoryRouter initialEntries={["/w/ws-1/x"]}>
      <Routes>
        <Route path="/w/:workspaceId/x" element={<Harness step={step} initial={initial} />} />
        <Route path="/w/:workspaceId/campaigns/new/manual" element={<div>manual</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AscAssistantPanel — Step 1 (Slice 3)", () => {
  beforeEach(() => invokeMock.mockReset());

  it("valid Interviewer response renders question + chip and Confirm updates business input", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          step: 1,
          nextQuestion: {
            id: "q-1",
            prompt: "What industry does the business work in?",
            targetField: "business.industryPresetId",
            inputKind: "text",
          },
          proposedFields: [
            {
              targetField: "business.industryPresetId",
              value: "legal",
              confidence: "medium",
              rationale: "Mentioned attorneys.",
            },
          ],
          confirmedFieldsAcknowledged: [],
        },
      },
      error: null,
    });

    mountPanel(1);
    fireEvent.click(screen.getByTestId("asc-assistant-ask-1"));

    await waitFor(() =>
      expect(screen.getByTestId("asc-assistant-question-1")).toBeInTheDocument(),
    );
    const chip = await screen.findByTestId(/^asc-assistant-proposal-prop-/);
    expect(chip).toHaveTextContent("legal");

    const confirmBtn = screen.getByTestId(/^asc-assistant-confirm-prop-/);
    fireEvent.click(confirmBtn);

    expect(screen.getByTestId("industry-value")).toHaveTextContent("legal");
  });

  it("schema-invalid response surfaces recoverable error and does not mutate draft", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: false, code: "schema_invalid", message: "bad shape" },
      error: null,
    });
    mountPanel(1);
    fireEvent.click(screen.getByTestId("asc-assistant-ask-1"));
    await waitFor(() =>
      expect(screen.getByTestId("asc-assistant-error-1")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("industry-value")).toHaveTextContent("general");
    // Retry button is present and re-invokes.
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          step: 1,
          nextQuestion: null,
          proposedFields: [],
          confirmedFieldsAcknowledged: [],
        },
      },
      error: null,
    });
    fireEvent.click(screen.getByTestId("asc-assistant-retry-1"));
    await waitFor(() =>
      expect(screen.queryByTestId("asc-assistant-error-1")).not.toBeInTheDocument(),
    );
  });
});

describe("AscAssistantPanel — Step 2 (Slice 3)", () => {
  beforeEach(() => invokeMock.mockReset());

  it("Confirm on a step-2 proposal writes through to purpose input", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          step: 2,
          nextQuestion: {
            id: "q-1",
            prompt: "Is there a secondary outcome?",
            targetField: "purpose.secondaryOutcome",
            inputKind: "text",
          },
          proposedFields: [
            {
              targetField: "purpose.secondaryOutcome",
              value: "Capture qualified lead details",
              confidence: "high",
              rationale: "Common for intake.",
            },
          ],
          confirmedFieldsAcknowledged: ["purpose.primaryOutcome"],
        },
      },
      error: null,
    });
    mountPanel(2);
    fireEvent.click(screen.getByTestId("asc-assistant-ask-2"));
    await screen.findByTestId(/^asc-assistant-proposal-prop-/);
    fireEvent.click(screen.getByTestId(/^asc-assistant-confirm-prop-/));
    expect(screen.getByTestId("secondary-outcome-value")).toHaveTextContent(
      "Capture qualified lead details",
    );
  });
});

describe("AscAssistantPanel — resume / no-re-ask (Slice 3)", () => {
  beforeEach(() => invokeMock.mockReset());

  it("after a field is confirmed, the next turn's nextQuestion for the same field is dropped", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          step: 1,
          nextQuestion: {
            id: "q-1",
            prompt: "Industry?",
            targetField: "business.industryPresetId",
            inputKind: "text",
          },
          proposedFields: [
            {
              targetField: "business.industryPresetId",
              value: "legal",
              confidence: "high",
              rationale: "x",
            },
          ],
          confirmedFieldsAcknowledged: [],
        },
      },
      error: null,
    });
    mountPanel(1);
    fireEvent.click(screen.getByTestId("asc-assistant-ask-1"));
    await screen.findByTestId(/^asc-assistant-proposal-prop-/);
    fireEvent.click(screen.getByTestId(/^asc-assistant-confirm-prop-/));
    expect(screen.getByTestId("industry-value")).toHaveTextContent("legal");

    // Second turn — model re-asks the same field. The reducer must strip
    // the nextQuestion so the UI does not render it.
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          step: 1,
          nextQuestion: {
            id: "q-2",
            prompt: "What industry exactly?",
            targetField: "business.industryPresetId",
            inputKind: "text",
          },
          proposedFields: [],
          confirmedFieldsAcknowledged: ["business.industryPresetId"],
        },
      },
      error: null,
    });
    fireEvent.click(screen.getByTestId("asc-assistant-ask-1"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledTimes(2),
    );
    // The question card should not appear for the suppressed re-ask.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("asc-assistant-question-1")).not.toBeInTheDocument();
  });

  it("rehydrates pending proposals from meta.interviewer on remount", () => {
    const base = createEmptyAscDraft({
      id: "d-resume",
      workspaceId: "ws-1",
      createdBy: "u-1",
      now: "2026-06-16T00:00:00.000Z",
    });
    const seeded: AscDraft = {
      ...base,
      meta: {
        ...base.meta,
        interviewer: {
          confirmedFields: [],
          lastTurnByStep: {
            1: {
              questionId: "q-x",
              questionPrompt: "Persisted question?",
              questionTargetField: "business.industryPresetId",
              questionInputKind: "text",
              proposals: [
                {
                  id: "prop-x",
                  targetField: "business.industryPresetId",
                  value: "legal",
                  confidence: "high",
                  rationale: "persisted",
                  status: "pending",
                  fieldSnapshot: '"general"',
                  issuedAt: "2026-06-16T00:00:00.000Z",
                },
              ],
              askedAt: "2026-06-16T00:00:00.000Z",
            },
          },
        },
      },
    };
    mountPanel(1, seeded);
    expect(screen.getByTestId("asc-assistant-question-1")).toHaveTextContent(
      "Persisted question?",
    );
    expect(screen.getByTestId("asc-assistant-proposal-prop-x")).toBeInTheDocument();
  });
});
