/**
 * Phase 5 · Slice 1 — Route transition continuity.
 *
 * The canonical builder autosaves and then internally navigates from
 * `/w/:workspaceId/campaigns/new` (router-state prefill) to the legacy
 * `/admin/campaigns/edit/:id` (data reloaded from `intake_data` JSONB).
 * The AscOriginPanel must render identically across that boundary
 * because it reads from `intake.ascOrigin`, not from router state.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import { translateAscDraftToIntake } from "@/lib/asc/forkTranslator";
import { AscOriginPanel } from "@/components/campaigns/AscOriginPanel";
import type { CampaignIntakeData } from "@/types/campaign";

const FORKED_AT = "2026-06-17T00:00:00.000Z";

const emptyIntake: Partial<CampaignIntakeData> = {
  campaignName: "",
  clientName: "",
  newDispositions: [],
  existingDispositions: [],
};

function seed() {
  let d = createEmptyAscDraft({
    id: "asc-route", workspaceId: "ws", createdBy: "u",
    now: "2026-06-17T00:00:00.000Z",
  });
  d = ascReducer(d, {
    type: "UPDATE_BUSINESS",
    patch: { description: "Acme Plumbing for residential customers" },
  });
  d = ascReducer(d, {
    type: "UPDATE_PURPOSE",
    patch: { primaryOutcome: "Book service call" },
  });
  d = ascReducer(d, {
    type: "ADD_CALLER_REASON",
    reason: { id: "r1", label: "New service", requiredCapture: [] },
  });
  d = ascReducer(d, {
    type: "SET_DESTINATION",
    destination: { kind: "internal_runner" },
  });
  return d;
}

function renderPanel(intake: CampaignIntakeData, workspaceId: string) {
  return render(
    <AscOriginPanel
      workspaceId={workspaceId}
      ascOrigin={intake.ascOrigin!}
      existingNewDispositions={intake.newDispositions ?? []}
      onUpdateAscOrigin={() => {}}
      onAddNewDispositions={() => {}}
    />,
  );
}

describe("ASC route transition continuity (Phase 5 · Slice 1)", () => {
  it("renders the same AscOriginPanel content on /campaigns/new and on /admin/campaigns/edit/:id", () => {
    const draft = seed();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });

    // /w/:id/campaigns/new — initial mount from router-state prefill.
    const intakeOnNew = { ...emptyIntake, ...prefill } as CampaignIntakeData;
    const a = renderPanel(intakeOnNew, "ws");
    const newHtml = a.container.innerHTML;
    a.unmount();

    // Autosave persists intake_data as JSONB and the page reloads via
    // /admin/campaigns/edit/:id with `existing.intake_data` merged into
    // emptyIntake. ascOrigin must survive that path identically.
    const persisted = JSON.parse(JSON.stringify(intakeOnNew));
    const intakeOnEdit = { ...emptyIntake, ...persisted } as CampaignIntakeData;
    expect(intakeOnEdit.ascOrigin).toEqual(intakeOnNew.ascOrigin);

    const b = renderPanel(intakeOnEdit, "ws");
    const editHtml = b.container.innerHTML;
    b.unmount();

    expect(editHtml).toBe(newHtml);
  });

  it("preserves dismissed follow-up state across the transition", () => {
    const draft = seed();
    const { prefill } = translateAscDraftToIntake(draft, { forkedAt: FORKED_AT });
    let intake = { ...emptyIntake, ...prefill } as CampaignIntakeData;
    intake = {
      ...intake,
      ascOrigin: {
        ...intake.ascOrigin!,
        reviewState: { followUpsDismissedIds: ["t1"] },
      },
    };
    const persisted = JSON.parse(JSON.stringify(intake));
    const reloaded = { ...emptyIntake, ...persisted } as CampaignIntakeData;
    expect(reloaded.ascOrigin?.reviewState?.followUpsDismissedIds).toEqual(["t1"]);
  });
});
