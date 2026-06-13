/**
 * Phase 6 · AI copilot abstraction.
 *
 * Real LLM orchestration is Phase 7+ scope. For Phase 6 we ship a clean
 * `useCallCopilot(sessionState)` hook with a deterministic heuristic backend so
 * the UI, wiring, feedback loop, and contract are all real and testable.
 *
 * The heuristic intentionally derives suggestions from concrete session inputs
 * (current step, captured values, guide sections) so the panel updates as the
 * agent works the call. Replacing `computeSuggestions` with an LLM-backed
 * implementation is a one-file change.
 */
import { useMemo, useState, useCallback } from "react";
import type { CallSessionState, CopilotResult, CopilotSuggestion, CopilotFeedbackVerdict } from "@/types/call-runner";
import type { CampaignFlowContent, FlowStep, QuestionBranchConfig, FieldCaptureConfig, OutcomeDispositionConfig, InformationDisplayConfig } from "@/types/campaign-flow";
import type { WorkspaceGuideContentV2, WorkspaceGuideSection } from "@/types/workspace-guide";

export interface CopilotInputs {
  session: CallSessionState;
  flow: CampaignFlowContent | null;
  guide: WorkspaceGuideContentV2 | null;
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Snake/branch keys → human-readable phrase. */
export function prettifyKey(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/^__/, "")
    .replace(/__$/, "")
    .replace(/^branch_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function currentStep(flow: CampaignFlowContent | null, currentId: string | null): FlowStep | null {
  if (!flow || !currentId) return null;
  return flow.steps.find((s) => s.id === currentId) ?? null;
}

function pickGuideSection(
  guide: WorkspaceGuideContentV2 | null,
  needle: string,
): WorkspaceGuideSection | undefined {
  if (!guide) return undefined;
  const n = needle.toLowerCase();
  return guide.sections.find(
    (s) => s.enabled && (s.label.toLowerCase().includes(n) || s.kind === needle),
  );
}

function suggestedAnswer(step: FlowStep | null, guide: WorkspaceGuideContentV2 | null): CopilotSuggestion | null {
  if (!step) return null;
  if (step.type === "information_display") {
    const cfg = step.config as InformationDisplayConfig;
    return {
      id: id("sug"),
      kind: "suggested_answer",
      title: "Read this verbatim",
      body: cfg.body ?? "",
      source: "From flow step",
    };
  }
  if (step.type === "question_branch") {
    const cfg = step.config as QuestionBranchConfig;
    // Try to find a guide section relevant to the question prompt.
    const match = pickGuideSection(guide, "faqs") ?? pickGuideSection(guide, "business_overview");
    if (match) {
      const field = match.fields[0];
      return {
        id: id("sug"),
        kind: "suggested_answer",
        title: `Talking point · ${match.label}`,
        body: field?.value ?? "Reference the workspace guide for context.",
        source: `From workspace guide · ${match.label}`,
        rationale: `Question: ${cfg.prompt}`,
      };
    }
  }
  if (step.type === "field_capture") {
    const cfg = step.config as FieldCaptureConfig;
    const pretty = prettifyKey(cfg.fieldKey);
    return {
      id: id("sug"),
      kind: "suggested_answer",
      title: `Capture ${pretty}`,
      body: cfg.helper ?? `Ask the caller for ${pretty.toLowerCase()}.`,
      source: "Derived from current step",
    };
  }
  return null;
}

function nextBestQuestion(step: FlowStep | null, flow: CampaignFlowContent | null): CopilotSuggestion | null {
  if (!step || !flow) return null;
  const ordered = flow.steps.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((s) => s.id === step.id);
  const next = ordered[idx + 1];
  if (!next) return null;
  return {
    id: id("sug"),
    kind: "next_best_question",
    title: `Next: ${next.title}`,
    body: next.description ?? "Continue to the next step when the caller is ready.",
    source: "From campaign flow ordering",
  };
}

function draftSummary(session: CallSessionState, flow: CampaignFlowContent | null): CopilotSuggestion | null {
  const v = session.values;
  const ani = session.meta.ani ? `ANI ${session.meta.ani}` : "Caller";
  const captured = Object.keys(v).filter((k) => !k.startsWith("__") && v[k]).length;
  if (captured === 0 && !session.notes) return null;
  const reasonBranchKey = Object.keys(v).find((k) => k.startsWith("branch_"));
  const reason = reasonBranchKey ? String(v[reasonBranchKey]) : "general inquiry";
  const name = (v.caller_name as string) ?? (v.full_name as string) ?? "the caller";
  const summaryBody = [
    `${ani} reached us about ${reason}.`,
    `Spoke with ${name}. ${captured} field(s) captured across ${session.completedStepIds.length} step(s).`,
    session.notes ? `Notes: ${session.notes}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: id("sug"),
    kind: "draft_summary",
    title: "Draft call summary",
    body: summaryBody,
    source: "Synthesized from session state",
    rationale: flow ? `${flow.steps.length} step(s) in flow` : undefined,
  };
}

function likelyOutcome(step: FlowStep | null, session: CallSessionState): CopilotSuggestion | null {
  // If current step is outcome_disposition and no outcome chosen, suggest the
  // first allowed outcome as a default.
  if (step?.type === "outcome_disposition" && !session.values.__outcome__) {
    const cfg = step.config as OutcomeDispositionConfig;
    const first = cfg.allowedOutcomes?.[0];
    if (first) {
      return {
        id: id("sug"),
        kind: "likely_outcome",
        title: `Likely outcome: ${first.label}`,
        body: `Based on the captured information, "${first.label}" looks like the closest fit.`,
        source: "Heuristic — first allowed outcome",
      };
    }
  }
  return null;
}

function notificationTarget(step: FlowStep | null): CopilotSuggestion | null {
  if (step?.type === "notification_trigger") {
    const cfg = step.config as { channel?: string; target?: string };
    if (cfg.target) {
      return {
        id: id("sug"),
        kind: "notification_target",
        title: cfg.target,
        body: `Suggested ${cfg.channel ?? "notification"} target derived from the active step.`,
        source: "From flow step",
      };
    }
  }
  return null;
}

export function computeSuggestions(inputs: CopilotInputs): CopilotResult {
  const step = currentStep(inputs.flow, inputs.session.currentStepId);
  const all = [
    suggestedAnswer(step, inputs.guide),
    nextBestQuestion(step, inputs.flow),
    draftSummary(inputs.session, inputs.flow),
    likelyOutcome(step, inputs.session),
    notificationTarget(step),
  ].filter(Boolean) as CopilotSuggestion[];
  return { suggestions: all, empty: all.length === 0 };
}

/**
 * React hook wrapper. The deterministic heuristic is fast enough to run on every
 * change; if Phase 7 swaps in an LLM-backed source, debounce inside here.
 */
export function useCallCopilot(inputs: CopilotInputs) {
  const result = useMemo(() => computeSuggestions(inputs), [inputs]);
  const [feedback, setFeedback] = useState<Record<string, CopilotFeedbackVerdict>>({});
  const rate = useCallback((suggestionId: string, verdict: CopilotFeedbackVerdict) => {
    setFeedback((prev) => ({ ...prev, [suggestionId]: verdict }));
  }, []);
  return { ...result, feedback, rate };
}
