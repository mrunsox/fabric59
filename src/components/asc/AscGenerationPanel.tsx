/**
 * ASC Slice 6 — Step 8 generation panel.
 *
 * Explicit-trigger UI for the Logic Architect compile pipeline. States:
 *   Idle / never generated  — primary CTA, pre-flight gating hints.
 *   Compiling               — disabled CTA + progress indicator.
 *   Success                 — summary tiles + Regenerate (Step 9 still stub).
 *   Success + stale         — yellow banner, Regenerate, prior draft viewable.
 *   Error                   — recoverable retry + "Continue to manual builder".
 */
import { useNavigate } from "react-router-dom";
import type { Dispatch } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AscAction } from "@/lib/asc/actions";
import type { AscDraft, AscGenerationErrorCode } from "@/lib/asc/types";
import {
  selectCanGenerateStep8,
  selectGeneratedSummary,
  selectGenerationIsStale,
  selectGenerationMeta,
} from "@/lib/asc/selectors";
import {
  useAscStep8Generate,
  type UseAscStep8GenerateParams,
} from "@/hooks/useAscStep8Generate";

const ERROR_COPY: Record<AscGenerationErrorCode, { title: string; body: string }> = {
  schema_invalid: {
    title: "Generation response was malformed",
    body: "The assistant returned an unexpected shape. Your inputs are unchanged. Try again.",
  },
  incomplete: {
    title: "Generated draft was incomplete",
    body: "The assistant produced a draft we couldn't safely use. Your inputs are unchanged. Try again.",
  },
  unsafe: {
    title: "Generation flagged unsafe content",
    body: "Some content was rejected for safety. Your inputs are unchanged. Try again.",
  },
  rate_limited: {
    title: "Generation is rate-limited",
    body: "Too many requests right now. Wait a moment and try again.",
  },
  credits_exhausted: {
    title: "Out of AI credits",
    body: "The workspace has no AI credits left. Add credits or continue manually.",
  },
  upstream_error: {
    title: "Generation is unavailable",
    body: "The compile service couldn't be reached. Your inputs are unchanged. Try again.",
  },
  network_error: {
    title: "Network error",
    body: "Could not contact the compile service. Check your connection and try again.",
  },
};

export interface AscGenerationPanelProps
  extends Omit<UseAscStep8GenerateParams, "dispatch"> {
  workspaceId: string;
  dispatch: Dispatch<AscAction>;
}

export function AscGenerationPanel({
  draft,
  dispatch,
  grounding,
  workspaceId,
}: AscGenerationPanelProps) {
  const navigate = useNavigate();
  const { runGenerate } = useAscStep8Generate({ draft, dispatch, grounding });

  const meta = selectGenerationMeta(draft);
  const summary = selectGeneratedSummary(draft);
  const isStale = selectGenerationIsStale(draft);
  const gate = selectCanGenerateStep8(draft);

  const isCompiling = meta.status === "compiling";
  const hasGenerated = !!draft.generated;
  const hasError = meta.status === "error" && meta.lastError;

  const onRetry = () => {
    void runGenerate();
  };

  const onEscapeToManual = () => {
    dispatch({
      type: "DISCARD_STEP8_GENERATION",
      now: new Date().toISOString(),
    });
    navigate(`/w/${workspaceId}/campaigns/new/manual`);
  };

  return (
    <div className="space-y-4" data-testid="asc-generation-panel">
      {/* Inputs the generator will use — visible counts. */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Inputs ready to compile
            </div>
            <ul className="text-xs text-muted-foreground">
              <li>
                {draft.input.callerReasons.length} caller reason
                {draft.input.callerReasons.length === 1 ? "" : "s"}
              </li>
              <li>
                {(draft.input.outcomesDraftEdits ?? []).length} outcome
                {(draft.input.outcomesDraftEdits ?? []).length === 1 ? "" : "s"}
              </li>
              <li>
                {(draft.input.notificationsDraftEdits ?? []).length} notification rule
                {(draft.input.notificationsDraftEdits ?? []).length === 1 ? "" : "s"}
              </li>
              <li>
                destination kind:{" "}
                <span className="font-mono">
                  {draft.input.destination?.kind ?? "(not set)"}
                </span>
              </li>
              <li>
                launch slug:{" "}
                <span className="font-mono">
                  {draft.input.launch?.slug ?? "(not set)"}
                </span>
              </li>
            </ul>
          </div>
          <Button
            onClick={onRetry}
            disabled={!gate.ok || isCompiling}
            data-testid="asc-generate-button"
          >
            {isCompiling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compiling…
              </>
            ) : hasGenerated ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate draft
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate draft
              </>
            )}
          </Button>
        </div>
        {!gate.ok && !isCompiling ? (
          <p
            className="mt-3 text-xs text-muted-foreground"
            data-testid="asc-generate-gate"
          >
            {gate.reason}
          </p>
        ) : null}
        {isCompiling ? (
          <div className="mt-4 space-y-2" data-testid="asc-generate-progress">
            <Progress value={45} aria-label="Compiling flow" />
            <p className="text-xs text-muted-foreground">Compiling flow…</p>
          </div>
        ) : null}
      </Card>

      {/* Error state — recoverable. */}
      {hasError && meta.lastError ? (
        <Alert variant="destructive" data-testid="asc-generate-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {ERROR_COPY[meta.lastError.code]?.title ?? "Generation error"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {ERROR_COPY[meta.lastError.code]?.body ?? meta.lastError.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onRetry} disabled={isCompiling}>
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onEscapeToManual}
                data-testid="asc-generate-escape"
              >
                Continue to manual builder
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stale banner — generated still viewable. */}
      {hasGenerated && isStale && !isCompiling && !hasError ? (
        <Alert data-testid="asc-generate-stale">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Inputs changed since this draft was generated</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">
              The draft below was compiled from earlier inputs. Regenerate to
              pick up your edits.
            </p>
            <Button size="sm" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Success summary — viewable even when stale. */}
      {hasGenerated && summary ? (
        <Card className="p-4" data-testid="asc-generate-summary">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Check className="h-4 w-4 text-emerald-600" />
            Draft generated
            {meta.lastRunAt ? (
              <span className="text-xs text-muted-foreground">
                · {new Date(meta.lastRunAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <SummaryTile label="Flow nodes" value={summary.nodeCount} />
            <SummaryTile label="Flow edges" value={summary.edgeCount} />
            <SummaryTile label="Reason branches" value={summary.branchCount} />
            <SummaryTile label="Outcomes linked" value={summary.outcomeCount} />
            <SummaryTile
              label="Notifications"
              value={summary.notificationCount}
            />
            <SummaryTile label="TODOs" value={summary.todoCount} />
          </dl>
          {summary.lowConfidenceAreas.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Low confidence in: {summary.lowConfidenceAreas.join(", ")}.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">
            Review and editing land in a later slice. Step 9 (Review) is still
            a stub.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
