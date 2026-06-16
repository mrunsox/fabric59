/**
 * ASC Slice 3 — Assistant panel for Steps 1 & 2.
 *
 * Pure presentation + hook orchestration. The reducer is the single source
 * of truth for the draft; this component only dispatches via the hook.
 *
 * UI states (per scope lock — no blur triggers, explicit action only):
 *   - idle:    "Ask the assistant" button; manual fields above are editable.
 *   - loading: skeleton row; manual fields stay editable.
 *   - ready:   question (if any) + chip row with Confirm / Dismiss.
 *   - error:   inline alert with Try again. After 3 consecutive schema
 *              failures, also surface the canonical Switch to manual link.
 */
import { AlertCircle, Loader2, Sparkles, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceBadge } from "@/components/asc/ProvenanceBadge";
import { AscSwitchToManualLink } from "@/components/asc/AscSwitchToManualLink";
import { useAscInterviewer } from "@/hooks/useAscInterviewer";
import type { AscDraft, AscInterviewerProposal } from "@/lib/asc/types";
import type { Dispatch } from "react";
import type { AscAction } from "@/lib/asc/actions";

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  schema_invalid: {
    title: "Assistant response was malformed",
    body: "The assistant returned an unexpected shape. Your work is safe. Try again.",
  },
  rate_limited: {
    title: "Assistant is rate-limited",
    body: "Too many requests right now. Wait a moment and try again.",
  },
  credits_exhausted: {
    title: "Out of AI credits",
    body: "The workspace has no AI credits left. Add credits or continue manually.",
  },
  upstream_error: {
    title: "Assistant is unavailable",
    body: "The assistant couldn't be reached. Your work is safe. Try again.",
  },
  network_error: {
    title: "Network error",
    body: "Could not contact the assistant. Check your connection and try again.",
  },
};

function describeValue(value: AscInterviewerProposal["value"]): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export interface AscAssistantPanelProps {
  draft: AscDraft;
  step: 1 | 2;
  dispatch: Dispatch<AscAction>;
  /** Workspace id for the fallback Switch-to-manual link. */
  workspaceId: string;
  /** Friendly hint above the Ask button. Step-specific. */
  hint?: string;
}

export function AscAssistantPanel({
  draft,
  step,
  dispatch,
  workspaceId,
  hint,
}: AscAssistantPanelProps) {
  const { status, error, consecutiveSchemaFailures, askNext, confirm, reject } =
    useAscInterviewer({ draft, step, dispatch });

  const turn = draft.meta.interviewer?.lastTurnByStep?.[step];
  const pendingProposals = (turn?.proposals ?? []).filter(
    (p) => p.status === "pending",
  );
  const staleProposals = (turn?.proposals ?? []).filter(
    (p) => p.status === "stale",
  );
  const showPersistentFailureHint = consecutiveSchemaFailures >= 3;

  return (
    <Card
      data-testid={`asc-assistant-panel-step-${step}`}
      className="space-y-3 border-dashed bg-muted/20 p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Assistant
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`asc-assistant-ask-${step}`}
          disabled={status === "loading"}
          onClick={() => void askNext()}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Asking…
            </>
          ) : turn ? (
            "Ask next question"
          ) : (
            "Ask the assistant"
          )}
        </Button>
      </header>

      {hint && status === "idle" && !turn && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {status === "loading" && (
        <div className="space-y-2" data-testid={`asc-assistant-loading-${step}`}>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      )}

      {status === "error" && error && (
        <Alert variant="destructive" data-testid={`asc-assistant-error-${step}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{ERROR_COPY[error.code]?.title ?? "Assistant error"}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{ERROR_COPY[error.code]?.body ?? error.message}</p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                data-testid={`asc-assistant-retry-${step}`}
                onClick={() => void askNext()}
              >
                Try again
              </Button>
              {showPersistentFailureHint && (
                <AscSwitchToManualLink workspaceId={workspaceId} />
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {turn?.questionPrompt && status !== "loading" && (
        <div
          className="rounded-md border bg-background px-3 py-2 text-sm"
          data-testid={`asc-assistant-question-${step}`}
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Next question
          </div>
          <p className="mt-1">{turn.questionPrompt}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Answer this in the field above, or confirm a suggestion below.
          </p>
        </div>
      )}

      {(pendingProposals.length > 0 || staleProposals.length > 0) && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Suggestions
          </div>
          <ul className="flex flex-wrap gap-2">
            {pendingProposals.map((p) => (
              <li
                key={p.id}
                data-testid={`asc-assistant-proposal-${p.id}`}
                className="flex items-center gap-2 rounded-full border bg-background px-2 py-1 text-xs"
                title={p.rationale}
              >
                <ProvenanceBadge
                  provenance="inferred_best_practice"
                  showLabel={false}
                />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {p.targetField}
                </span>
                <span>{describeValue(p.value)}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  aria-label="Confirm"
                  data-testid={`asc-assistant-confirm-${p.id}`}
                  onClick={() => confirm(p.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  aria-label="Dismiss"
                  data-testid={`asc-assistant-reject-${p.id}`}
                  onClick={() => reject(p.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
            {staleProposals.map((p) => (
              <li
                key={p.id}
                data-testid={`asc-assistant-stale-${p.id}`}
                className="flex items-center gap-2 rounded-full border border-dashed bg-muted px-2 py-1 text-xs text-muted-foreground"
                title="You changed this field after the suggestion was made."
              >
                <span className="font-mono text-[11px]">{p.targetField}</span>
                <span className="line-through">{describeValue(p.value)}</span>
                <span className="italic">outdated</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  aria-label="Dismiss"
                  data-testid={`asc-assistant-reject-${p.id}`}
                  onClick={() => reject(p.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {turn && !turn.questionPrompt && pendingProposals.length === 0 && status === "ready" && (
        <p
          className="text-xs text-muted-foreground"
          data-testid={`asc-assistant-no-question-${step}`}
        >
          Assistant has no further questions for this step.
        </p>
      )}
    </Card>
  );
}
