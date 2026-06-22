import { describe, it, expect } from "vitest";
import { computeWorkspaceSetupSteps } from "@/hooks/useWorkspaceSetupReadiness";

const ALL_FALSE = {
  workspaceId: "ws-1",
  workspaceName: "Acme",
  hasIdentity: false,
  factCount: 0,
  hasConnectedChannel: false,
  workspaceGuidePublished: false,
  campaignCount: 0,
  dispositionCount: 0,
  anyCampaignReady: false,
};

describe("computeWorkspaceSetupSteps", () => {
  it("returns eight steps in canonical order", () => {
    const steps = computeWorkspaceSetupSteps(ALL_FALSE);
    expect(steps.map((s) => s.key)).toEqual([
      "identity",
      "knowledge",
      "channel",
      "workspace_guide",
      "first_campaign",
      "dispositions",
      "campaign_ready",
      "cockpit_ready",
    ]);
  });

  it("marks each step done based on its signal", () => {
    const steps = computeWorkspaceSetupSteps({
      ...ALL_FALSE,
      hasIdentity: true,
      factCount: 3,
      hasConnectedChannel: true,
      workspaceGuidePublished: true,
      campaignCount: 2,
      dispositionCount: 1,
      anyCampaignReady: true,
    });
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it("uses honest wording for the knowledge step (seeded, not complete)", () => {
    const steps = computeWorkspaceSetupSteps(ALL_FALSE);
    const k = steps.find((s) => s.key === "knowledge")!;
    expect(k.label.toLowerCase()).toMatch(/seed|started/);
    expect(k.signal).toContain("bb_facts");
  });

  it("cockpit_ready step is derivative of all preceding steps", () => {
    const partial = computeWorkspaceSetupSteps({
      ...ALL_FALSE,
      hasIdentity: true,
      factCount: 3,
      hasConnectedChannel: true,
      workspaceGuidePublished: true,
      campaignCount: 1,
      dispositionCount: 1,
      anyCampaignReady: false, // missing
    });
    expect(partial.find((s) => s.key === "cockpit_ready")!.done).toBe(false);

    const full = computeWorkspaceSetupSteps({
      ...ALL_FALSE,
      hasIdentity: true,
      factCount: 3,
      hasConnectedChannel: true,
      workspaceGuidePublished: true,
      campaignCount: 1,
      dispositionCount: 1,
      anyCampaignReady: true,
    });
    expect(full.find((s) => s.key === "cockpit_ready")!.done).toBe(true);
  });

  it("hrefs all deep-link into the active workspace", () => {
    const steps = computeWorkspaceSetupSteps(ALL_FALSE);
    for (const s of steps) {
      expect(s.href.startsWith("/w/ws-1/")).toBe(true);
    }
  });
});
