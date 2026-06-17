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
import { selectCanFork, selectIsForked } from "@/lib/asc/selectors";
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
    const result = forkToCanonical(draft);
    const now = new Date().toISOString();
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

  // Slice 8 — once forked, lock the visible step to Step 10 so the
  // "handed off" banner is reachable instead of silently kicking the user
  // out. Re-fork is prevented by selectCanFork.
  const effectiveStep = draft.state === "forked" ? ASC_TOTAL_STEPS : currentStep;

  const body = renderStep(effectiveStep, {
    draft,
    dispatch,
    onJumpToStep: setStep,
    onForkToCanonical: handleFork,
  });

  return (
    <AscWizardShell
      workspaceId={workspaceId}
      draft={{ ...draft, step: effectiveStep }}
      dispatch={dispatch}
      autosaveStatus={autosaveStatus}
      lastSavedAt={lastSavedAt}
      onSelectStep={setStep}
      onBack={() => setStep(effectiveStep - 1)}
      onContinue={() => setStep(effectiveStep + 1)}
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
