import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  enabledSteps,
  computeVisibleStepIds,
  nextStepIdFor,
  validateStep,
  activeActions,
} from "@/lib/call-runner/flow-execution";
import {
  buildInteractionPayload,
  submitInteractionDraft,
  readPendingInteractions,
} from "@/lib/call-runner/submit";
import {
  emptySession,
  loadSession,
  saveSession,
  clearSession,
  sessionKey,
} from "@/lib/call-runner/session-store";
import { computeSuggestions } from "@/hooks/useCallCopilot";
import type { CampaignFlowContent } from "@/types/campaign-flow";
import type { WorkspaceGuideContentV2 } from "@/types/workspace-guide";
import type { CallSessionMeta } from "@/types/call-runner";

const ROOT = path.resolve(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const META: CallSessionMeta = {
  workspaceId: "ws-1",
  workspaceName: "Acme",
  campaignId: "c-1",
  campaignName: "Inbound",
  callId: "call-xyz",
  ani: "555-0100",
  startedAt: "2026-06-12T00:00:00.000Z",
};

const FLOW: CampaignFlowContent = {
  schemaVersion: 1,
  steps: [
    { id: "s1", type: "information_display", title: "Greeting", order: 1, required: false, enabled: true, nextStepId: null, rules: [], config: { body: "Hi" } },
    { id: "s2", type: "field_capture", title: "Name", order: 2, required: true, enabled: true, nextStepId: null, rules: [], config: { fieldKey: "caller_name", fieldType: "short_text" } },
    { id: "s3", type: "question_branch", title: "Reason", order: 3, required: true, enabled: true, nextStepId: null, rules: [], config: { prompt: "?", options: [{ id: "o1", label: "New", goto: "s5" }, { id: "o2", label: "Other", goto: null }] } },
    { id: "s4", type: "field_capture", title: "Detail", order: 4, required: false, enabled: true, nextStepId: null, rules: [], config: { fieldKey: "detail", fieldType: "long_text" } },
    { id: "s5", type: "outcome_disposition", title: "Disposition", order: 5, required: true, enabled: true, nextStepId: null, rules: [], config: { allowedOutcomes: [{ code: "closed", label: "Closed" }] } },
  ],
  mappings: [],
};

const GUIDE: WorkspaceGuideContentV2 = {
  schemaVersion: 2,
  sections: [
    { id: "g1", kind: "faqs", label: "FAQs", visibility: "agent", required: false, enabled: true, fields: [{ id: "f1", label: "Hours", value: "9-5 weekdays" }] },
  ],
};

describe("Phase 6 · route + page wiring", () => {
  it("App.tsx mounts /app/agent/workspace runner routes", () => {
    const src = read("App.tsx");
    expect(src).toMatch(/path="\/app\/agent\/workspace"\s+element={<AgentWorkspaceLandingPage/);
    expect(src).toMatch(/path="\/app\/agent\/workspace\/:workspaceId\/:campaignId"\s+element={<LiveCallRunnerPage/);
    expect(src).toMatch(/import LiveCallRunnerPage from/);
  });

  it("does not remove existing compatibility surfaces", () => {
    const src = read("App.tsx");
    // Existing /w/:workspaceId/agent (cockpit) and /app/workspaces redirects stay intact.
    expect(src).toMatch(/path="agent" element={<WorkspaceAgentCockpitPage/);
    expect(src).toMatch(/path="\/app\/workspaces\/:workspaceId\/\*" element={<LegacyWorkspaceRedirect/);
  });

  it("runner page consumes Phase 4/5 published hooks (no drafts)", () => {
    const src = read("pages/agent/LiveCallRunnerPage.tsx");
    expect(src).toMatch(/usePublishedSingletonGuide/);
    expect(src).toMatch(/usePublishedCampaignFlow/);
    expect(src).not.toMatch(/useLatestSingletonVersion|useLatestCampaignFlowVersion/);
  });
});

describe("Phase 6 · flow execution semantics (Phase 5 parity)", () => {
  it("enabled steps respect enabled flag and order", () => {
    const out = enabledSteps(FLOW);
    expect(out.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4", "s5"]);
  });

  it("hide_step rule removes the step from the visible set", () => {
    const flow: CampaignFlowContent = {
      ...FLOW,
      steps: FLOW.steps.map((s) =>
        s.id === "s2"
          ? { ...s, rules: [{ id: "r", groups: [{ id: "g", combinator: "AND", conditions: [{ id: "c", source: "skip", op: "eq", value: "yes" }] }], action: { type: "hide_step", stepId: "s4" } }] }
          : s,
      ),
    };
    const visible = computeVisibleStepIds(enabledSteps(flow), { skip: "yes" });
    expect(visible.has("s4")).toBe(false);
    expect(visible.has("s2")).toBe(true);
  });

  it("nextStepIdFor honors branchGoto then sequential", () => {
    const steps = enabledSteps(FLOW);
    const visible = computeVisibleStepIds(steps, {});
    const s3 = steps.find((s) => s.id === "s3")!;
    expect(nextStepIdFor({ step: s3, steps, values: {}, visibleIds: visible, branchGoto: "s5" })).toBe("s5");
    expect(nextStepIdFor({ step: s3, steps, values: {}, visibleIds: visible })).toBe("s4");
  });

  it("nextStepIdFor honors a jump_to rule above branchGoto", () => {
    const steps = enabledSteps({
      ...FLOW,
      steps: FLOW.steps.map((s) =>
        s.id === "s3"
          ? { ...s, rules: [{ id: "r", groups: [{ id: "g", combinator: "AND", conditions: [{ id: "c", source: "vip", op: "eq", value: true } as never] }], action: { type: "jump_to", stepId: "s5" } }] }
          : s,
      ),
    });
    const visible = computeVisibleStepIds(steps, { vip: true });
    const s3 = steps.find((s) => s.id === "s3")!;
    expect(nextStepIdFor({ step: s3, steps, values: { vip: true }, visibleIds: visible, branchGoto: "s4" })).toBe("s5");
  });

  it("validateStep enforces required field_capture", () => {
    const s2 = FLOW.steps.find((s) => s.id === "s2")!;
    expect(validateStep(s2, {}).ok).toBe(false);
    expect(validateStep(s2, { caller_name: "Pat" }).ok).toBe(true);
  });

  it("require_field rule blocks advance when condition fires", () => {
    const step = {
      ...FLOW.steps[3],
      rules: [{
        id: "r",
        groups: [{ id: "g", combinator: "AND" as const, conditions: [{ id: "c", source: "urgent", op: "eq" as const, value: "yes" }] }],
        action: { type: "require_field" as const, fieldKey: "detail" },
      }],
    };
    expect(validateStep(step, { urgent: "yes" }).ok).toBe(false);
    expect(validateStep(step, { urgent: "yes", detail: "hi" }).ok).toBe(true);
  });

  it("activeActions reports enable_escalation / enable_notification", () => {
    const flow: CampaignFlowContent = {
      ...FLOW,
      steps: FLOW.steps.map((s) =>
        s.id === "s2"
          ? { ...s, rules: [
              { id: "r1", groups: [{ id: "g", combinator: "AND", conditions: [{ id: "c", source: "vip", op: "is_set" }] }], action: { type: "enable_escalation", targetId: "supervisor" } },
              { id: "r2", groups: [{ id: "g", combinator: "AND", conditions: [{ id: "c", source: "vip", op: "is_set" }] }], action: { type: "enable_notification", targetId: "ops-channel" } },
            ] }
          : s,
      ),
    };
    const out = activeActions(enabledSteps(flow), { vip: "yes" });
    expect(out.escalations).toContain("supervisor");
    expect(out.notifications).toContain("ops-channel");
  });
});

describe("Phase 6 · session persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("session key includes workspace, campaign, call id", () => {
    expect(sessionKey(META)).toMatch(/ws-1.*c-1.*call-xyz/);
  });

  it("emptySession initializes schema v1 and empty arrays", () => {
    const s = emptySession(META);
    expect(s.schemaVersion).toBe(1);
    expect(s.completedStepIds).toEqual([]);
    expect(s.values).toEqual({});
    expect(s.finalized).toBe(false);
  });

  it("save then load round-trips state", () => {
    const s = { ...emptySession(META), values: { caller_name: "Pat" }, completedStepIds: ["s1"] };
    saveSession(s);
    const loaded = loadSession(META);
    expect(loaded?.values.caller_name).toBe("Pat");
    expect(loaded?.completedStepIds).toEqual(["s1"]);
  });

  it("clear removes the persisted session", () => {
    saveSession(emptySession(META));
    clearSession(META);
    expect(loadSession(META)).toBeNull();
  });
});

describe("Phase 6 · copilot wiring", () => {
  it("returns at least one suggestion for an in-progress session", () => {
    const session = { ...emptySession(META), currentStepId: "s3" };
    const result = computeSuggestions({ session, flow: FLOW, guide: GUIDE });
    expect(result.empty).toBe(false);
    expect(result.suggestions.some((s) => s.kind === "next_best_question")).toBe(true);
  });

  it("suggested likely outcome when on outcome_disposition with no choice yet", () => {
    const session = { ...emptySession(META), currentStepId: "s5" };
    const result = computeSuggestions({ session, flow: FLOW, guide: GUIDE });
    expect(result.suggestions.some((s) => s.kind === "likely_outcome")).toBe(true);
  });
});

describe("Phase 6 · submission payload + stub", () => {
  beforeEach(() => window.localStorage.clear());

  it("buildInteractionPayload includes meta, values, outcome, and finalizedAt", () => {
    const session = {
      ...emptySession(META),
      values: { caller_name: "Pat", __outcome__: "closed" },
      notes: "talked",
      completedStepIds: ["s1", "s2"],
    };
    const payload = buildInteractionPayload(session, null);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.outcomeCode).toBe("closed");
    expect(payload.values.caller_name).toBe("Pat");
    expect(payload.notes).toBe("talked");
    expect(payload.completedStepIds).toEqual(["s1", "s2"]);
    expect(payload.finalizedAt).toMatch(/T/);
  });

  it("submitInteractionDraft enqueues to the local pending list (Phase 7 boundary)", async () => {
    const session = { ...emptySession(META), values: { x: 1 } };
    const payload = buildInteractionPayload(session, null);
    await submitInteractionDraft(payload);
    const queue = readPendingInteractions();
    expect(queue.length).toBe(1);
    expect(queue[0].payload.meta.callId).toBe("call-xyz");
  });
});

describe("Phase 6 · vocabulary containment", () => {
  it("runner runtime files do not hardcode legal vocabulary", () => {
    const files = [
      "pages/agent/LiveCallRunnerPage.tsx",
      "pages/agent/AgentWorkspaceLandingPage.tsx",
      "components/call-runner/GuidePanel.tsx",
      "components/call-runner/FlowPanel.tsx",
      "components/call-runner/CopilotPanel.tsx",
      "components/call-runner/SessionHeader.tsx",
      "hooks/useCallRunnerSession.ts",
      "hooks/useCallCopilot.ts",
      "lib/call-runner/session-store.ts",
      "lib/call-runner/flow-execution.ts",
      "lib/call-runner/submit.ts",
      "types/call-runner.ts",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(/law firm|attorney|practice area|legal advice/i.test(src), `${rel} leaks legal vocab`).toBe(false);
    }
  });
});
