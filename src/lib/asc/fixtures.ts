/**
 * ASC Slice 1 — seeded fixture drafts for local development and tests.
 * No I/O; pure data.
 */
import type { AscDraft, AscWizardInput } from "./types";

export function createEmptyAscInput(): AscWizardInput {
  return {
    business: {
      description: "",
      industryPresetId: "general",
      hours: { coverage: "business_hours" },
      callerPersonas: [],
      promisesToAvoid: [],
    },
    purpose: {
      primaryOutcome: "",
      blockingOutcomes: [],
      sharedAcrossClients: false,
    },
    callerReasons: [],
  };
}

export function createEmptyAscDraft(params: {
  id: string;
  workspaceId: string;
  createdBy: string;
  skinId?: string;
  now?: string;
}): AscDraft {
  const now = params.now ?? new Date().toISOString();
  return {
    schemaVersion: 1,
    id: params.id,
    workspaceId: params.workspaceId,
    state: "in_progress",
    step: 1,
    stepStatus: {
      1: "in_progress",
      2: "idle",
      3: "idle",
      4: "idle",
      5: "idle",
      6: "idle",
      7: "idle",
      8: "idle",
      9: "idle",
      10: "idle",
    },
    input: createEmptyAscInput(),
    confidence: {},
    unresolved: [],
    rationales: {},
    forks: [],
    meta: {
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      skinId: params.skinId,
    },
  };
}

/** Deterministic fixture used by tests and storybook-style empty states. */
export const SEED_ASC_DRAFT: AscDraft = createEmptyAscDraft({
  id: "asc-fixture-001",
  workspaceId: "ws-fixture",
  createdBy: "user-fixture",
  skinId: "general",
  now: "2026-01-01T00:00:00.000Z",
});
