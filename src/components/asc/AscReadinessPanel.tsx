/**
 * ASC Slice 8 — Step 10 readiness + safe handoff surface.
 *
 * Read-only except for navigation: edit-at-source links jump to Steps 3–8
 * via `onJumpToStep`, and a single primary CTA hands off into the
 * canonical campaign intake (purely client-side prefill — no canonical
 * records are created here).
 *
 * Idempotency: once `draft.state === "forked"`, the CTA is replaced with
 * a "handed off" banner and an "Open canonical builder" link.
 */
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AscDraft } from "@/lib/asc/types";
import {
  selectIsForked,
  selectReadinessReport,
  type AscReadinessIssue,
} from "@/lib/asc/selectors";

export interface AscReadinessPanelProps {
  draft: AscDraft;
  workspaceId: string;
  onJumpToStep?: (step: number) => void;
  /** Caller must guard internally if a fork is already in flight; the
   *  panel calls this only when no blockers exist and the draft is not
   *  already forked. */
  onForkToCanonical?: () => void;
}

export function AscReadinessPanel({
  draft,
  workspaceId,
  onJumpToStep,
  onForkToCanonical,
}: AscReadinessPanelProps) {
  const report = selectReadinessReport(draft);
  const isForked = selectIsForked(draft);
  const blockerCount = report.blockers.length;
  const warningCount = report.warnings.length;
  const ctaDisabled = isForked || !report.isSafeToFork || !onForkToCanonical;
  const lastFork = draft.forks?.[draft.forks.length - 1];

  return (
    <div className="space-y-4" data-testid="asc-readiness-panel">
      <Card
        className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        data-testid="asc-readiness-summary"
      >
        <div className="flex items-start gap-2">
          {report.isSafeToFork && !isForked ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {isForked
                ? "Draft handed off to the canonical builder"
                : report.isSafeToFork
                  ? "Ready to hand off"
                  : `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} to resolve before handoff`}
            </p>
            <p className="text-muted-foreground" data-testid="asc-readiness-counts">
              {blockerCount} blocker{blockerCount === 1 ? "" : "s"} ·{" "}
              {warningCount} warning{warningCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {isForked ? (
          <Button asChild size="sm" variant="outline" data-testid="asc-readiness-open-canonical">
            <a href={`/w/${workspaceId}/campaigns`}>
              Go to campaigns
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    type="button"
                    disabled={ctaDisabled}
                    onClick={() => {
                      if (ctaDisabled) return;
                      onForkToCanonical?.();
                    }}
                    data-testid="asc-readiness-continue"
                  >
                    Continue in canonical builder
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              {ctaDisabled && (
                <TooltipContent>
                  {blockerCount > 0
                    ? `Resolve ${blockerCount} blocker${blockerCount === 1 ? "" : "s"} above to continue.`
                    : "Handoff is not available yet."}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </Card>

      {isForked && lastFork && (
        <Card
          className="border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900"
          data-testid="asc-readiness-forked-banner"
        >
          <p className="font-medium">
            Handed off on {formatAt(lastFork.at)} by {lastFork.by}
          </p>
          <p className="mt-1 text-emerald-900/80">
            Changes here no longer affect the canonical campaign. ASC will
            not re-fork the same draft — continue editing and publishing
            from the canonical builder. (Deep-link to the exact handed-off
            canonical draft is not available yet; use the campaigns list.)
          </p>
        </Card>
      )}

      {blockerCount > 0 && (
        <Card
          className="border-red-300 bg-red-50/60 p-4"
          data-testid="asc-readiness-blockers"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-900">
            <AlertTriangle className="h-4 w-4" />
            Blockers ({blockerCount})
          </div>
          <ul className="space-y-2">
            {report.blockers.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onJumpToStep={onJumpToStep}
                tone="blocker"
              />
            ))}
          </ul>
        </Card>
      )}

      {warningCount > 0 && (
        <Card
          className="border-amber-200 bg-amber-50/40 p-4"
          data-testid="asc-readiness-warnings"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Warnings ({warningCount})
          </div>
          <ul className="space-y-2">
            {report.warnings.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onJumpToStep={onJumpToStep}
                tone="warning"
              />
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-900/70">
            Warnings are non-blocking. You can continue into the canonical
            builder and address them there, or jump back to the source step.
          </p>
        </Card>
      )}

      {!isForked && report.isSafeToFork && warningCount === 0 && (
        <Card className="border-dashed p-4 text-xs text-muted-foreground">
          No blockers and no warnings. Handoff creates a prefilled canonical
          campaign intake — nothing is published yet.
        </Card>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onJumpToStep,
  tone,
}: {
  issue: AscReadinessIssue;
  onJumpToStep?: (step: number) => void;
  tone: "blocker" | "warning";
}) {
  return (
    <li
      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between"
      data-testid={`asc-readiness-issue-${issue.id}`}
    >
      <span className={tone === "blocker" ? "text-red-900" : "text-amber-900"}>
        {issue.message}
      </span>
      {issue.jumpToStep && onJumpToStep && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => onJumpToStep(issue.jumpToStep!)}
          data-testid={`asc-readiness-issue-${issue.id}-jump`}
        >
          Edit in Step {issue.jumpToStep}
        </Button>
      )}
    </li>
  );
}

function formatAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
