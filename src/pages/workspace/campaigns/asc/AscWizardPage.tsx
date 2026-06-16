/**
 * ASC Slice 1 — wizard host page.
 *
 * Owns the AscDraft state via useAscDraft and routes the per-step bodies.
 * No AI calls in Slice 1; step bodies are minimal stubs.
 */
import { useCallback, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { AscWizardShell } from "@/components/asc/AscWizardShell";
import { useAscWizardFlag } from "@/lib/asc/flagResolver";
import { useAscDraft } from "@/hooks/useAscDraft";
import { useAuth } from "@/contexts/AuthContext";
import { ASC_TOTAL_STEPS } from "@/lib/asc/types";

import { AscStepBusiness } from "./steps/AscStepBusiness";
import { AscStepPurpose } from "./steps/AscStepPurpose";
import { AscStepCallerTypes } from "./steps/AscStepCallerTypes";
import { AscStepHandling } from "./steps/AscStepHandling";
import { AscStepOutcomes } from "./steps/AscStepOutcomes";
import { AscStepNotifications } from "./steps/AscStepNotifications";
import { AscStepDestination } from "./steps/AscStepDestination";
import { AscStepGenerate } from "./steps/AscStepGenerate";
import { AscStepReview } from "./steps/AscStepReview";
import { AscStepReadiness } from "./steps/AscStepReadiness";

const DRAFT_ID_STORAGE_PREFIX = "fabric59.asc.activeDraftId.";

function resolveActiveDraftId(workspaceId: string): string {
  const key = `${DRAFT_ID_STORAGE_PREFIX}${workspaceId}`;
  if (typeof window === "undefined") return "asc-temp";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const fresh = `asc-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return "asc-temp";
  }
}

export default function AscWizardPage() {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const flag = useAscWizardFlag(workspaceId);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const draftId = useMemo(() => resolveActiveDraftId(workspaceId), [workspaceId]);
  const { draft, dispatch, autosaveStatus, lastSavedAt, handoffToManual } =
    useAscDraft({
      workspaceId,
      draftId,
      createdBy: user?.id ?? "anonymous",
    });

  const urlStep = Number(searchParams.get("step"));
  const currentStep =
    Number.isFinite(urlStep) && urlStep >= 1 && urlStep <= ASC_TOTAL_STEPS
      ? urlStep
      : draft.step;

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

  // Flag off → bounce out to manual without flashing wizard UI.
  if (!flag.enabled) {
    return <Navigate to={`/w/${workspaceId}/campaigns/new/manual`} replace />;
  }

  // Already forked → canonical edit page is the source of truth.
  if (draft.state === "forked") {
    return <Navigate to={`/w/${workspaceId}/campaigns`} replace />;
  }

  const body = renderStep(currentStep, { draft, dispatch });

  return (
    <AscWizardShell
      workspaceId={workspaceId}
      draft={{ ...draft, step: currentStep }}
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
