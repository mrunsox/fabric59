import { describe, it, expect } from "vitest";
import { buildAssistContext } from "@/lib/business-brain/assistContext";
import type { CallSessionMeta, CallSessionState } from "@/types/call-runner";
import type { CampaignFlowContent, FlowStep } from "@/types/campaign-flow";

function meta(overrides: Partial<CallSessionMeta> = {}): CallSessionMeta {
  return {
    workspaceId: "ws1",
    campaignId: "c1",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

function session(overrides: Partial<CallSessionState> = {}): CallSessionState {
  return {
    schemaVersion: 1,
    meta: meta(),
    currentStepId: null,
    completedStepIds: [],
    values: {},
    notes: "",
    updatedAt: new Date().toISOString(),
    finalized: false,
    ...overrides,
  };
}

function step(id: string, type: FlowStep["type"], title = ""): FlowStep {
  return {
    id, type, title, order: 1, enabled: true, required: false, rules: [],
  } as FlowStep;
}

function flow(steps: FlowStep[]): CampaignFlowContent {
  return { schemaVersion: 1, steps, outputMappings: [] } as unknown as CampaignFlowContent;
}

describe("buildAssistContext", () => {
  it("returns workspace/clientId and unknown step kind when no flow/session step", () => {
    const ctx = buildAssistContext({ meta: meta(), session: session(), flow: null });
    expect(ctx.workspaceId).toBe("ws1");
    expect(ctx.stepId).toBeNull();
    expect(ctx.stepKind).toBe("unknown");
    expect(ctx.hasContext).toBe(false);
  });

  it("maps flow step type to assist step kind", () => {
    const f = flow([step("s1", "field_capture", "Caller info")]);
    const ctx = buildAssistContext({
      meta: meta(),
      session: session({ currentStepId: "s1" }),
      flow: f,
    });
    expect(ctx.stepKind).toBe("intake");
    expect(ctx.hasContext).toBe(true);
  });

  it("upgrades step kind from title hints (escalation, hours, transfer)", () => {
    const cases: Array<[string, string]> = [
      ["After hours fallback", "hours"],
      ["Urgent escalation path", "escalation"],
      ["Transfer / route to office", "destination"],
    ];
    for (const [title, expected] of cases) {
      const f = flow([step("s1", "information_display", title)]);
      const ctx = buildAssistContext({
        meta: meta(),
        session: session({ currentStepId: "s1" }),
        flow: f,
      });
      expect(ctx.stepKind).toBe(expected);
    }
  });

  it("extracts lowercase serviceHints / destinationHints from values", () => {
    const ctx = buildAssistContext({
      meta: meta(),
      session: session({ values: { service: "Family Law", __transfer_group__: "Intake Team" } }),
      flow: null,
    });
    expect(ctx.serviceHints).toContain("family law");
    expect(ctx.destinationHints).toContain("intake team");
  });

  it("flags afterHours when local hour is < 8 or >= 18", () => {
    const morningCtx = buildAssistContext({
      meta: meta(), session: session(), flow: null,
      now: new Date(2026, 0, 1, 6, 0),
    });
    const eveningCtx = buildAssistContext({
      meta: meta(), session: session(), flow: null,
      now: new Date(2026, 0, 1, 20, 0),
    });
    const middayCtx = buildAssistContext({
      meta: meta(), session: session(), flow: null,
      now: new Date(2026, 0, 1, 12, 0),
    });
    expect(morningCtx.afterHours).toBe(true);
    expect(eveningCtx.afterHours).toBe(true);
    expect(middayCtx.afterHours).toBe(false);
  });
});
