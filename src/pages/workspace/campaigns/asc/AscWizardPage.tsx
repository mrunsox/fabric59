/**
 * ASC Slice 2 — wizard host page.
 *
 * Owns the AscDraft state via useAscDraft and routes the per-step bodies.
 * Persistence lives in `campaign_setups.intake_data.ascDraft`; this page
 * mirrors the assigned `setupId` into the URL so a refresh resumes against
 * the same row.
 */
import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AscWizardShell } from "@/components/asc/AscWizardShell";
import { useAscWizardFlag } from "@/lib/asc/flagResolver";
import { useAscDraft } from "@/hooks/useAscDraft";
import { useAuth } from "@/contexts/AuthContext";
import { ASC_TOTAL_STEPS } from "@/lib/asc/types";
import { selectCanFork, selectIsForked, selectIsReadOnly } from "@/lib/asc/selectors";
import { forkToCanonical } from "@/lib/asc/reducer";

import {
  AscStepBusiness,
  AscStepPurpose,
  AscStepCallerTypes,
  AscStepHandling,
  AscStepOutcomes,
  AscStepNotifications,
  AscStepDestination,
  AscStepGenerate,
  AscStepReview,
  AscStepReadiness,
} from "./steps";

export default function AscWizardPage() {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const flag = useAscWizardFlag(workspaceId);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const existingSetupId = searchParams.get("setupId");

  const onSetupIdAssigned = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      if (next.get("setupId") === id) return;
      next.set("setupId", id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const { draft, dispatch, autosaveStatus, lastSavedAt, handoffToManual } =
    useAscDraft({
      workspaceId,
      createdBy: user?.id ?? "anonymous",
      existingSetupId: existingSetupId ?? null,
      onSetupIdAssigned,
    });

  const urlStep = Number(searchParams.get("step"));
  const currentStep = useMemo(() => {
    return Number.isFinite(urlStep) && urlStep >= 1 && urlStep <= ASC_TOTAL_STEPS
      ? urlStep
      : draft.step;
  }, [urlStep, draft.step]);

  const setStep = useCallback(
    (step: number) => {
      const clamped = Math.min(Math.max(1, step), ASC_TOTAL_STEPS);
      dispatch({ type: "SET_STEP", step: clamped });
      const next = new URLSearchParams(searchParams);
      next.set("step", String(clamped));
      setSearchParams(next, { replace: true });
    },
    [dispatch, searchParams, setSearchParams],
  );

  const navigate = useNavigate();

  const handleFork = useCallback(() => {
    if (!selectCanFork(draft)) return;
    if (selectIsForked(draft)) return;
    const now = new Date().toISOString();
    const result = forkToCanonical(draft, { forkedAt: now });
    dispatch({
      type: "MARK_FORKED",
      at: now,
      by: user?.id ?? "anonymous",
      target: "canonical_builder",
    });
    navigate(`/w/${workspaceId}/campaigns/new`, {
      state: {
        prefill: result.prefill,
        source: result.source,
        ascDraftId: result.ascDraftId,
      },
    });
  }, [draft, dispatch, navigate, workspaceId, user?.id]);

  // Flag off → bounce out to manual without flashing wizard UI.
  if (!flag.enabled) {
    return <Navigate to={`/w/${workspaceId}/campaigns/new/manual`} replace />;
  }

  // Slice 2 (Phase 5) — after fork, the wizard becomes a read-only browser.
  // Navigation across Steps 1–9 is still permitted so users can inspect the
  // historical record, but every mutating dispatch is no-op'd at the reducer
  // boundary and form controls are disabled via a fieldset wrapper.
  const isReadOnly = selectIsReadOnly(draft);

  const stepBody = renderStep(currentStep, {
    draft,
    dispatch,
    onJumpToStep: setStep,
    onForkToCanonical: handleFork,
  });

  // Step 10 keeps its own controls (navigation, "Open canonical builder")
  // active even in read-only mode. Steps 1–9 are wrapped in a disabled
  // fieldset so native form controls are inert.
  const body =
    isReadOnly && currentStep !== ASC_TOTAL_STEPS ? (
      <fieldset
        disabled
        data-testid="asc-readonly-fieldset"
        className="m-0 min-w-0 border-0 p-0"
      >
        {stepBody}
      </fieldset>
    ) : (
      stepBody
    );

  return (
    <AscWizardShell
      workspaceId={workspaceId}
      draft={{ ...draft, step: currentStep }}
      dispatch={dispatch}
      autosaveStatus={autosaveStatus}
      lastSavedAt={lastSavedAt}
      onSelectStep={setStep}
      onBack={() => setStep(currentStep - 1)}
      onContinue={() => setStep(currentStep + 1)}
      onHandoffToManual={() => handoffToManual(workspaceId)}
    >

      {body}
    </AscWizardShell>
  );
}

function renderStep(
  step: number,
  ctx: Parameters<typeof AscStepBusiness>[0],
) {
  switch (step) {
    case 1:
      return <AscStepBusiness {...ctx} />;
    case 2:
      return <AscStepPurpose {...ctx} />;
    case 3:
      return <AscStepCallerTypes {...ctx} />;
    case 4:
      return <AscStepHandling {...ctx} />;
    case 5:
      return <AscStepOutcomes {...ctx} />;
    case 6:
      return <AscStepNotifications {...ctx} />;
    case 7:
      return <AscStepDestination {...ctx} />;
    case 8:
      return <AscStepGenerate {...ctx} />;
    case 9:
      return <AscStepReview {...ctx} />;
    case 10:
      return <AscStepReadiness {...ctx} />;
    default:
      return <AscStepBusiness {...ctx} />;
  }
}
