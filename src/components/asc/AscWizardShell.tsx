import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AscStepper, ASC_STEP_LABELS } from "./AscStepper";
import { AscSidePanel } from "./AscSidePanel";
import { AscFooterNav } from "./AscFooterNav";
import { AscSwitchToManualLink } from "./AscSwitchToManualLink";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import type { AscAutosaveStatus } from "@/hooks/useAscDraft";
import type { Dispatch } from "react";
import { selectCanContinue, selectIsReadOnly } from "@/lib/asc/selectors";

export interface AscWizardShellProps {
  workspaceId: string;
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
  autosaveStatus: AscAutosaveStatus;
  lastSavedAt: string | null;
  onSelectStep: (step: number) => void;
  onBack: () => void;
  onContinue: () => void;
  onHandoffToManual: () => string;
  /** Maps a Business Brain suggestion → existing ASC action dispatch. */
  onApplyBbIntent: (
    intent: import("@/lib/business-brain/selectors").BbAscApplyIntent,
    suggestion: import("@/lib/business-brain/selectors").BbAscSuggestion,
  ) => void;
  organizationId?: string | null;
  children: ReactNode;
}


function formatSaveLabel(
  status: AscAutosaveStatus,
  lastSavedAt: string | null,
): string {
  if (status === "saving") return "Saving…";
  if (status === "error") return "Save failed — retrying";
  if (status === "saved" && lastSavedAt) {
    try {
      const d = new Date(lastSavedAt);
      return `Saved ${d.toLocaleTimeString()}`;
    } catch {
      return "Saved";
    }
  }
  return "Draft";
}

export function AscWizardShell({
  workspaceId,
  draft,
  dispatch,
  autosaveStatus,
  lastSavedAt,
  onSelectStep,
  onBack,
  onContinue,
  onHandoffToManual,
  onApplyBbIntent,
  organizationId = null,
  children,
}: AscWizardShellProps) {
  const canContinue = selectCanContinue(draft, draft.step);
  const isReadOnly = selectIsReadOnly(draft);
  const lastFork = draft.forks?.[draft.forks.length - 1];

  return (
    <div
      data-testid="asc-wizard-shell"
      className="flex h-[calc(100vh-8rem)] flex-col rounded-md border bg-background"
    >
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/w/${workspaceId}/campaigns`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Assisted script creation</span>
            <span
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              data-testid="asc-step-pill"
            >
              Step {draft.step} · {ASC_STEP_LABELS[draft.step]}
            </span>
          </div>
        </div>
        <AscSwitchToManualLink
          workspaceId={workspaceId}
          onConfirm={onHandoffToManual}
        />
      </header>

      {isReadOnly && (
        <div
          data-testid="asc-forked-banner"
          className="border-b border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-900"
        >
          <p className="font-medium">
            This draft has been handed off to the canonical builder. Changes
            here no longer affect the canonical campaign.
          </p>
          {lastFork && (
            <p className="mt-0.5 text-emerald-900/80">
              Forked on {formatForkedAt(lastFork.at)} by {lastFork.by}.{" "}
              <Link
                to={`/w/${workspaceId}/campaigns`}
                className="underline underline-offset-2"
                data-testid="asc-forked-banner-open-campaigns"
              >
                Go to campaigns
              </Link>{" "}
              to find the handed-off draft (deep-link to the exact canonical
              draft is not available yet).
            </p>
          )}
        </div>
      )}

      <div className="grid flex-1 grid-cols-[220px_minmax(0,1fr)_280px] overflow-hidden">
        <div className="overflow-y-auto border-r">
          <AscStepper draft={draft} onSelectStep={onSelectStep} />
        </div>
        <main className="overflow-y-auto p-6" data-testid="asc-step-body">
          {children}
        </main>
        <AscSidePanel
          draft={draft}
          dispatch={dispatch}
          workspaceId={workspaceId}
          organizationId={organizationId}
          onApplyBbIntent={onApplyBbIntent}
        />
      </div>

      <AscFooterNav
        step={draft.step}
        canContinue={canContinue && !isReadOnly}
        onBack={onBack}
        onContinue={onContinue}
        saveLabel={formatSaveLabel(autosaveStatus, lastSavedAt)}
      />
    </div>
  );
}

function formatForkedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

