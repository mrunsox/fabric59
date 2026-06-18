/**
 * ASC Slice 2 — wizard host page.
 *
 * Source of truth for handoff + post-fork behavior: docs/asc-architecture.md
 *
 *
 * Owns the AscDraft state via useAscDraft and routes the per-step bodies.
 * Persistence lives in `campaign_setups.intake_data.ascDraft`; this page
 * mirrors the assigned `setupId` into the URL so a refresh resumes against
 * the same row.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AscWizardShell } from "@/components/asc/AscWizardShell";
import { useAscWizardFlag } from "@/lib/asc/flagResolver";
import { useAscDraft } from "@/hooks/useAscDraft";
import { useAuth } from "@/contexts/AuthContext";
import { ASC_TOTAL_STEPS } from "@/lib/asc/types";
import { selectCanFork, selectIsForked, selectIsReadOnly } from "@/lib/asc/selectors";
import { forkToCanonical } from "@/lib/asc/reducer";
import { emitAscEvent } from "@/lib/asc/telemetry";
import type {
  BbAscApplyIntent,
  BbAscSuggestion,
} from "@/lib/business-brain/selectors";

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
  const { user, organization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = organization?.id ?? null;

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

  // Telemetry — once per draft id per mount
  const openedRef = useRef<string | null>(null);
  const lastStepRef = useRef<number>(currentStep);
  useEffect(() => {
    if (!draft.id) return;
    if (openedRef.current === draft.id) return;
    openedRef.current = draft.id;
    emitAscEvent("asc_wizard_opened", {
      ascDraftId: draft.id,
      workspaceId,
      organizationId: orgId,
    });
  }, [draft.id, workspaceId, orgId]);

  useEffect(() => {
    lastStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    return () => {
      const state = draft.state;
      if (state === "forked" || state === "published" || state === "discarded") return;
      emitAscEvent("asc_wizard_abandoned", {
        ascDraftId: draft.id,
        workspaceId,
        organizationId: orgId,
        lastStep: lastStepRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usedAiForDraft = useMemo(() => {
    const m = draft.meta;
    return Boolean(m.interviewer || m.gapFinder || m.logicArchitect || m.generation);
  }, [draft.meta]);

  const handleContinue = useCallback(() => {
    emitAscEvent("asc_step_completed", {
      ascDraftId: draft.id,
      workspaceId,
      organizationId: orgId,
      step: currentStep,
      usedAi: usedAiForDraft,
    });
    setStep(currentStep + 1);
  }, [draft.id, workspaceId, orgId, currentStep, usedAiForDraft, setStep]);

  const handleBack = useCallback(() => {
    emitAscEvent("asc_step_back", {
      ascDraftId: draft.id,
      workspaceId,
      organizationId: orgId,
      step: currentStep,
    });
    setStep(currentStep - 1);
  }, [draft.id, workspaceId, orgId, currentStep, setStep]);

  const handleFork = useCallback(() => {
    if (!selectCanFork(draft)) return;
    if (selectIsForked(draft)) return;
    emitAscEvent("asc_handoff_initiated", {
      ascDraftId: draft.id,
      workspaceId,
      organizationId: orgId,
    });
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
  }, [draft, dispatch, navigate, workspaceId, user?.id, orgId]);
  /**
   * Phase 2 — Business Brain → ASC apply bridge.
   *
   * Maps a `BbAscApplyIntent` from the side panel's suggestion tray into an
   * existing ASC reducer action. NO new action types may be added here.
   * Intents that don't have a clean mapping are filtered out upstream in the
   * selector layer (no clipboard fallback).
   */
  const applyBbIntent = useCallback(
    (intent: BbAscApplyIntent, _suggestion: BbAscSuggestion) => {
      if (isReadOnlyMaybe(draft)) return;
      switch (intent.kind) {
        case "addCallerReason": {
          dispatch({
            type: "ADD_CALLER_REASON",
            reason: {
              id: cryptoRandomId(),
              label: intent.label,
              requiredCapture: intent.requiredCapture ?? [],
              opener: intent.opener,
            },
          });
          return;
        }
        case "appendRequiredCaptureToFirstReason": {
          const first = draft.input.callerReasons[0];
          if (!first) return;
          const merged = mergeUnique(first.requiredCapture ?? [], intent.fields);
          dispatch({
            type: "UPDATE_CALLER_REASON",
            id: first.id,
            patch: { requiredCapture: merged },
          });
          return;
        }
        case "addNotificationEdit": {
          dispatch({
            type: "ADD_NOTIFICATION_EDIT",
            notification: {
              id: cryptoRandomId(),
              trigger: intent.trigger,
              channel: intent.channel,
              note: intent.note,
            },
          });
          return;
        }
        case "setDestinationDeepLink": {
          dispatch({
            type: "SET_DESTINATION",
            destination: {
              kind: "deep_link",
              deepLinkTemplate: intent.deepLinkTemplate,
              notes: intent.notes,
              openMode: "new_tab",
            },
          });
          return;
        }
      }
    },
    [dispatch, draft],
  );


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
      onBack={handleBack}
      onContinue={handleContinue}
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
