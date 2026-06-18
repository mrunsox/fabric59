/**
 * Business Brain suggestion tray (Phase 2).
 *
 * Renders read-only, source-backed cards from Business Brain for the current
 * ASC step. Mutation only occurs via the parent's `onApply` callback, which
 * dispatches existing ASC reducer actions. Dismiss is local-state only.
 *
 * This component imports ONLY from the bridge module
 * `@/lib/business-brain/selectors` and the hook `useBusinessBrainSuggestions`.
 */
import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  BbAscApplyIntent,
  BbAscSuggestion,
} from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";

export interface BbSuggestionTrayProps {
  workspaceId: string;
  ascDraftId?: string | null;
  organizationId?: string | null;
  step: number;
  isReadOnly: boolean;
  suggestions: BbAscSuggestion[];
  /** Called when the user clicks Use. Must dispatch an existing ASC action. */
  onApply: (intent: BbAscApplyIntent, suggestion: BbAscSuggestion) => void;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return new Date(iso).toLocaleDateString();
}

const BAND_LABEL: Record<BbAscSuggestion["confidenceBand"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function BbSuggestionTray({
  workspaceId,
  ascDraftId,
  organizationId,
  step,
  isReadOnly,
  suggestions,
  onApply,
}: BbSuggestionTrayProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hiddenForkedEmitted, setHiddenForkedEmitted] = useState(false);

  useEffect(() => {
    if (isReadOnly && !hiddenForkedEmitted) {
      emitBbEvent("bb_asc_suggestion_hidden_forked", {
        workspaceId,
        organizationId: organizationId ?? null,
        ascDraftId: ascDraftId ?? undefined,
        step,
      });
      setHiddenForkedEmitted(true);
    }
  }, [
    isReadOnly,
    hiddenForkedEmitted,
    workspaceId,
    organizationId,
    ascDraftId,
    step,
  ]);

  const visible = useMemo(
    () => suggestions.filter((s) => !dismissed.has(s.id)),
    [suggestions, dismissed],
  );

  if (isReadOnly) return null;
  if (visible.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="bb-tray-empty">
        No approved knowledge matches this step yet. Approve facts in the
        Business Brain to see suggestions here.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="bb-suggestion-tray">
      {visible.map((s) => (
        <article
          key={s.id}
          data-testid="bb-suggestion-card"
          data-suggestion-id={s.id}
          className="rounded-md border bg-background p-3 shadow-sm"
        >
          <header className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Sparkles
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              />
              <h4 className="text-sm font-medium leading-tight">{s.title}</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissed((prev) => {
                  const next = new Set(prev);
                  next.add(s.id);
                  return next;
                });
                emitBbEvent("bb_asc_suggestion_dismissed", {
                  workspaceId,
                  organizationId: organizationId ?? null,
                  ascDraftId: ascDraftId ?? undefined,
                  step: s.step,
                  factId: s.factId,
                  entityType: s.entityType,
                });
              }}
              aria-label="Dismiss suggestion"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>
          {s.snippet ? (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {s.snippet}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]" title={BAND_LABEL[s.confidenceBand]}>
              {s.confidenceBand}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {s.sourceCount} source{s.sourceCount === 1 ? "" : "s"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              · reviewed {formatRelative(s.lastReviewedAt)}
            </span>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="bb-suggestion-use"
              onClick={() => {
                onApply(s.apply, s);
                setDismissed((prev) => {
                  const next = new Set(prev);
                  next.add(s.id);
                  return next;
                });
                emitBbEvent("bb_asc_suggestion_used", {
                  workspaceId,
                  organizationId: organizationId ?? null,
                  ascDraftId: ascDraftId ?? undefined,
                  step: s.step,
                  factId: s.factId,
                  entityType: s.entityType,
                });
              }}
            >
              Use
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
