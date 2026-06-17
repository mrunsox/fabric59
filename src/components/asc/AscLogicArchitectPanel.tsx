/**
 * ASC Slice 5 — Logic Architect panel.
 *
 * Proposal-only UI: shows pending proposals (Step 5/6/7), advisories, and
 * stale items. Explicit "Suggest" button, no blur/mount triggers.
 *
 * Per scope guards:
 *   - Step 5 outcome `kind` is rendered as a small proposal-local hint chip,
 *     never as a user-facing taxonomy concept.
 *   - Step 6 notification proposals visibly separate outcome / channel /
 *     audience / urgency / note even though persistence stays flat.
 *   - Step 7 slug candidates render as picker chips; only the chosen
 *     candidate is confirmable, and confirm is disabled until the
 *     deterministic uniqueness check passes.
 */
import { useMemo, useState } from "react";
import type { Dispatch } from "react";
import { AlertCircle, Loader2, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProvenanceBadge } from "@/components/asc/ProvenanceBadge";
import type { AscAction } from "@/lib/asc/actions";
import type { AscDraft, AscLogicArchitectProposal } from "@/lib/asc/types";
import {
  slugIsUnique,
  type AscLaNotificationValue,
  type AscLaOutcomeValue,
  type AscLaStep,
} from "@/lib/asc/logicArchitectSchema";
import {
  useAscLogicArchitect,
  type AscLaGrounding,
} from "@/hooks/useAscLogicArchitect";

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  schema_invalid: {
    title: "Architect response was malformed",
    body: "The assistant returned an unexpected shape. Your work is safe. Try again.",
  },
  rate_limited: {
    title: "Architect is rate-limited",
    body: "Too many requests right now. Wait a moment and try again.",
  },
  credits_exhausted: {
    title: "Out of AI credits",
    body: "The workspace has no AI credits left. Add credits or continue manually.",
  },
  upstream_error: {
    title: "Architect is unavailable",
    body: "The architect couldn't be reached. Your work is safe. Try again.",
  },
  network_error: {
    title: "Network error",
    body: "Could not contact the architect. Check your connection and try again.",
  },
};

export interface AscLogicArchitectPanelProps {
  draft: AscDraft;
  step: AscLaStep;
  dispatch: Dispatch<AscAction>;
  grounding?: AscLaGrounding;
  hint?: string;
}

function OutcomeProposalCard({
  p,
  onConfirm,
  onReject,
}: {
  p: AscLogicArchitectProposal;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const v = p.value as AscLaOutcomeValue;
  return (
    <div
      data-testid={`asc-la-outcome-${p.id}`}
      className="flex items-start justify-between gap-3 rounded-md border bg-background p-2"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <ProvenanceBadge provenance="inferred_best_practice" showLabel={false} />
          <span className="font-medium">{v.label}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {v.kind}
          </span>
        </div>
        {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
        <p className="text-[11px] italic text-muted-foreground">{p.rationale}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Confirm"
          data-testid={`asc-la-confirm-${p.id}`}
          onClick={onConfirm}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Dismiss"
          data-testid={`asc-la-reject-${p.id}`}
          onClick={onReject}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NotificationProposalCard({
  p,
  onConfirm,
  onReject,
}: {
  p: AscLogicArchitectProposal;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const v = p.value as AscLaNotificationValue;
  return (
    <div
      data-testid={`asc-la-notification-${p.id}`}
      className="flex items-start justify-between gap-3 rounded-md border bg-background p-2"
    >
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <ProvenanceBadge provenance="inferred_best_practice" showLabel={false} />
          <span className="text-muted-foreground">outcome</span>
          <span className="font-medium">{v.outcomeRef}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">channel</span>
          <span className="font-mono">{v.channelRef}</span>
          {v.audienceRef && (
            <>
              <span className="text-muted-foreground">·  audience</span>
              <span className="font-mono">{v.audienceRef}</span>
            </>
          )}
          <span
            className={
              "rounded px-1.5 py-0.5 text-[10px] uppercase " +
              (v.urgency === "high"
                ? "bg-destructive/10 text-destructive"
                : v.urgency === "low"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary")
            }
          >
            {v.urgency}
          </span>
        </div>
        {v.note && <p className="text-muted-foreground">{v.note}</p>}
        <p className="italic text-muted-foreground">{p.rationale}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Confirm"
          data-testid={`asc-la-confirm-${p.id}`}
          onClick={onConfirm}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Dismiss"
          data-testid={`asc-la-reject-${p.id}`}
          onClick={onReject}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DestinationProposalRow({
  p,
  onConfirm,
  onReject,
}: {
  p: AscLogicArchitectProposal;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div
      data-testid={`asc-la-destination-${p.id}`}
      className="flex items-start justify-between gap-3 rounded-md border bg-background p-2 text-xs"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ProvenanceBadge provenance="inferred_best_practice" showLabel={false} />
          <span className="font-mono">{p.targetField}</span>
          <span>=</span>
          <span className="font-medium">{String(p.value)}</span>
        </div>
        <p className="italic text-muted-foreground">{p.rationale}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Confirm"
          data-testid={`asc-la-confirm-${p.id}`}
          onClick={onConfirm}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Dismiss"
          data-testid={`asc-la-reject-${p.id}`}
          onClick={onReject}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SlugCandidatesCard({
  p,
  takenSlugs,
  onConfirm,
  onReject,
}: {
  p: AscLogicArchitectProposal;
  takenSlugs: string[];
  onConfirm: (chosen: string, isUnique: boolean) => void;
  onReject: () => void;
}) {
  const candidates = p.value as string[];
  const [chosen, setChosen] = useState<string | null>(null);
  const isUnique = chosen ? slugIsUnique(chosen, takenSlugs) : false;
  return (
    <div
      data-testid={`asc-la-slug-${p.id}`}
      className="space-y-2 rounded-md border bg-background p-2"
    >
      <div className="flex items-center gap-2 text-xs">
        <ProvenanceBadge provenance="inferred_best_practice" showLabel={false} />
        <span className="text-muted-foreground">Pick a launch slug</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {candidates.map((c) => {
          const unique = slugIsUnique(c, takenSlugs);
          const selected = chosen === c;
          return (
            <li key={c}>
              <button
                type="button"
                disabled={!unique}
                data-testid={`asc-la-slug-candidate-${c}`}
                onClick={() => setChosen(c)}
                className={
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs " +
                  (selected
                    ? "border-primary bg-primary/10 text-primary"
                    : unique
                      ? "bg-muted hover:bg-muted/70"
                      : "cursor-not-allowed bg-muted/40 text-muted-foreground line-through")
                }
                title={unique ? "Available" : "Already in use"}
              >
                <span className="font-mono">{c}</span>
                {!unique && <span className="text-[10px]">taken</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="italic text-[11px] text-muted-foreground">{p.rationale}</p>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={!chosen || !isUnique}
          data-testid={`asc-la-confirm-${p.id}`}
          onClick={() => chosen && onConfirm(chosen, isUnique)}
        >
          Use this slug
        </Button>
        <Button
          size="sm"
          variant="ghost"
          data-testid={`asc-la-reject-${p.id}`}
          onClick={onReject}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function AscLogicArchitectPanel({
  draft,
  step,
  dispatch,
  grounding,
  hint,
}: AscLogicArchitectPanelProps) {
  const { status, error, runArchitect } = useAscLogicArchitect({
    draft,
    step,
    dispatch,
    grounding,
  });

  const meta = draft.meta.logicArchitect;
  const proposals = meta?.proposalsByStep?.[step] ?? [];
  const advisories = meta?.advisoriesByStep?.[step] ?? [];
  const pending = proposals.filter((p) => p.status === "pending");
  const stale = proposals.filter((p) => p.status === "stale");

  const ctaLabel = useMemo(() => {
    if (status === "loading") return "Thinking…";
    if (step === 5) return proposals.length ? "Suggest more outcomes" : "Suggest outcomes";
    if (step === 6)
      return proposals.length ? "Suggest more notifications" : "Suggest notifications";
    return proposals.length ? "Suggest more options" : "Suggest destination & slug";
  }, [status, step, proposals.length]);

  return (
    <Card
      data-testid={`asc-la-panel-step-${step}`}
      className="space-y-3 border-dashed bg-muted/20 p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Architect
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`asc-la-run-${step}`}
          disabled={status === "loading"}
          onClick={() => void runArchitect()}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Thinking…
            </>
          ) : (
            ctaLabel
          )}
        </Button>
      </header>

      {hint && status === "idle" && proposals.length === 0 && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {status === "error" && error && (
        <Alert variant="destructive" data-testid={`asc-la-error-${step}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{ERROR_COPY[error.code]?.title ?? "Architect error"}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{ERROR_COPY[error.code]?.body ?? error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runArchitect()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Proposals
          </div>
          <ul className="space-y-2">
            {pending.map((p) => {
              const confirm = () =>
                dispatch({
                  type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
                  step,
                  proposalId: p.id,
                });
              const reject = () =>
                dispatch({
                  type: "REJECT_LOGIC_ARCHITECT_PROPOSAL",
                  step,
                  proposalId: p.id,
                });
              return (
                <li key={p.id}>
                  {p.targetField === "outcomes.add" ? (
                    <OutcomeProposalCard p={p} onConfirm={confirm} onReject={reject} />
                  ) : p.targetField === "notifications.add" ? (
                    <NotificationProposalCard
                      p={p}
                      onConfirm={confirm}
                      onReject={reject}
                    />
                  ) : p.targetField === "launch.slugCandidates" ? (
                    <SlugCandidatesCard
                      p={p}
                      takenSlugs={grounding?.takenSlugs ?? []}
                      onConfirm={(chosen, isUnique) =>
                        dispatch({
                          type: "CONFIRM_LOGIC_ARCHITECT_PROPOSAL",
                          step,
                          proposalId: p.id,
                          chosenSlug: chosen,
                          slugIsUnique: isUnique,
                        })
                      }
                      onReject={reject}
                    />
                  ) : (
                    <DestinationProposalRow
                      p={p}
                      onConfirm={confirm}
                      onReject={reject}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {advisories.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Advisories
          </div>
          <ul
            className="space-y-1 text-xs text-muted-foreground"
            data-testid={`asc-la-advisories-${step}`}
          >
            {advisories.map((a, i) => (
              <li key={i} className="flex gap-1">
                <span aria-hidden>·</span>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stale.length > 0 && (
        <ul className="space-y-1">
          {stale.map((p) => (
            <li
              key={p.id}
              data-testid={`asc-la-stale-${p.id}`}
              className="rounded-md border border-dashed bg-muted px-2 py-1 text-[11px] text-muted-foreground"
            >
              <span className="font-mono">{p.targetField}</span> — outdated by your edit. Re-run to refresh.
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
