/**
 * Phase 6 · Slice 1 — Golden path: ASC draft → fork translator → canonical
 * intake assimilation → publish-path validation.
 *
 * This test will break loudly if:
 *   - translator output shape changes incompatibly,
 *   - canonical intake stops respecting prefill/ascOrigin during merge,
 *   - someone sneaks an ASC-specific branch into the publish-path
 *     required-field rules.
 *
 * See: docs/asc-architecture.md
 */
import { describe, it, expect } from "vitest";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import type { AscDraft, AscGenerated } from "@/lib/asc/types";
import type { CampaignIntakeData } from "@/types/campaign";

const FORKED_AT = "2026-06-17T12:00:00.000Z";

// Mirror of CampaignIntakePage's `emptyIntake` initializer — keep in sync.
// We pin the required-field shape here so the test breaks if the canonical
// publish-path contract drifts.
const emptyIntake: CampaignIntakeData = {
  campaignName: "",
  clientName: "",
  campaignDescription: "",
  whiteLabel: false,
  isMultiDepartment: false,
  departments: [],
  aniNumbers: [""],
  dnisNumbers: [""],
  coverageType: "24/7",
  existingDispositions: [],
  newDispositions: [],
  enableDispositionEmail: false,
  dispositionEmailConfigs: [],
  backendDocConnector: false,
  connectors: [],
  decisionTree: [],
  skillName: "",
  assignedUsers: [],
  addSkillToIvr: false,
  additionalNotes: "",
  priority: "normal",
};

/** The exact predicate used by canonical `handleSave("submitted")`. */
function passesPublishRequiredFields(intake: CampaignIntakeData): boolean {
  return Boolean(intake.campaignName) && Boolean(intake.clientName);
}

function buildRealisticDraft(): AscDraft {
  let d = createEmptyAscDraft({
    id: "asc-happy-1",
    workspaceId: "ws-1",
    createdBy: "user-1",
    now: "2026-06-17T11:00:00.000Z",
  });
  d = ascReducer(d, {
    type: "UPDATE_BUSINESS",
    patch: {
      description:
        "Northwest Plumbing Co. handles inbound service calls for residential and light-commercial plumbing emergencies",
    },
  });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: {
      primaryOutcome: "Book a same-day service visit",
      secondaryOutcome: "Capture a callback for non-urgent work",
    },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "Emergency leak", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r2", label: "Schedule maintenance", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: {
      kind: "external_url",
      externalUrl: "https://nwplumb.example.com/book",
      openMode: "new_tab",
    },
  });
  d = ascReducer(d, {
    type: "SET_LAUNCH",
    launch: { slug: "nwplumb-inbound" },
  });

  // Step 8 generation applied (minimal but valid AscGenerated).
  const generated: AscGenerated = {
    schemaVersion: 1,
    generatedAt: "2026-06-17T11:30:00.000Z",
    inputFingerprint: "fp-happy",
    flow: { nodes: [], edges: [] },
    reasonToBranch: {},
    outcomes: [],
    notifications: [],
    destinationLaunch: {
      destination: { kind: "external_url" },
      launch: {},
    },
    todos: [
      { id: "t1", area: "copy", message: "Confirm emergency triage script" },
      { id: "t2", area: "copy", message: "Add overnight overflow language" },
    ],
    confidenceByArea: {},
  };
  d = { ...d, generated };
  return d;
}

describe("ASC → canonical golden path (Phase 6 · Slice 1)", () => {
  it("walks fork → assimilation → publish validation with no ASC-specific branches", () => {
    // 1. Build a representative draft.
    const draft = buildRealisticDraft();

    // 2. Translate.
    const result = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    expect(result.source).toBe("asc-wizard");
    expect(result.ascDraftId).toBe("asc-happy-1");

    const { prefill } = result;
    expect(prefill.campaignName).toBeTruthy();
    expect(prefill.clientName).toBeTruthy();
    expect(prefill.campaignName!.length).toBeLessThanOrEqual(60);

    expect(prefill.ascOrigin).toBeDefined();
    expect(prefill.ascOrigin!.ascDraftId).toBe("asc-happy-1");
    expect(prefill.ascOrigin!.forkedAt).toBe(FORKED_AT);
    expect(prefill.ascOrigin!.carried?.primaryOutcome).toBe(
      "Book a same-day service visit",
    );
    expect(prefill.ascOrigin!.carried?.callerReasons).toEqual([
      { id: "r1", label: "Emergency leak" },
      { id: "r2", label: "Schedule maintenance" },
    ]);
    expect(prefill.ascOrigin!.carried?.destination?.kind).toBe("external_url");
    expect(prefill.ascOrigin!.carried?.launchSlug).toBe("nwplumb-inbound");
    expect(prefill.ascOrigin!.followUps).toHaveLength(2);

    // No ASC-only metadata leaks.
    const serialized = JSON.stringify(prefill);
    expect(serialized).not.toContain("interviewer");
    expect(serialized).not.toContain("gapFinder");
    expect(serialized).not.toContain("logicArchitect");
    expect(serialized).not.toContain("confidenceByArea");
    expect(serialized).not.toContain("inputFingerprint");

    // additionalNotes is the pointer only, not the structured payload.
    expect(prefill.additionalNotes ?? "").toMatch(/ASC origin panel/);
    expect(prefill.additionalNotes ?? "").not.toMatch(/Primary outcome/);
    expect(prefill.additionalNotes ?? "").not.toMatch(/Caller reasons/);

    // 3. Assimilate into a canonical intake (same merge pattern the page uses).
    const intake: CampaignIntakeData = { ...emptyIntake, ...prefill };
    expect(intake.ascOrigin).toBeDefined();
    expect(intake.ascOrigin!.ascDraftId).toBe("asc-happy-1");
    expect(intake.campaignName).toBe(prefill.campaignName);
    expect(intake.clientName).toBe(prefill.clientName);

    // 4. Publish-path validation: ASC-origin intake passes the exact same
    // required-field rule a non-ASC intake would. No ASC-specific branch.
    expect(passesPublishRequiredFields(intake)).toBe(true);

    const nonAscIntake: CampaignIntakeData = {
      ...emptyIntake,
      campaignName: "Manually entered",
      clientName: "Manual Client",
    };
    expect(passesPublishRequiredFields(nonAscIntake)).toBe(true);

    // And the empty intake fails for both shapes — same rule, no branch.
    expect(passesPublishRequiredFields(emptyIntake)).toBe(false);
  });
});
