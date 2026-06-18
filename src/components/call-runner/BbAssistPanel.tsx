/**
 * Business Brain — Live Runner Assist panel (Phase 4).
 *
 * Read-only surface. Renders 0–5 ranked assist cards derived from approved
 * Business Brain facts. Never mutates ASC, canonical, or runner state.
 *
 * Two affordances may write — both explicit:
 *   - Copy: writes to the clipboard (user action).
 *   - Insert into notes: APPENDS a clearly-attributed line to runner notes
 *     via the parent `onInsertIntoNotes` callback. Never replaces.
 *
 * Telemetry logs interaction structure only — no raw text, snippet,
 * source title, or note content is ever sent.
 */
import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  ClipboardPlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RunnerSurface } from "@/components/call-runner/primitives";
import { cn } from "@/lib/utils";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import type { BbAssistCard, AssistCardKind } from "@/lib/business-brain/assistRanker";
import { buildBbFactDeepLink, buildBbSourceDeepLink } from "@/lib/business-brain/selectors";

const KIND_LABEL: Record<AssistCardKind, string> = {
  intent_hint: "Caller intent",
  intake_reminder: "Intake reminder",
  hours_guidance: "Hours guidance",
  escalation_guidance: "Escalation",
  destination_suggestion: "Destination",
  phrasing_reminder: "Policy reminder",
};

const BAND_CLS: Record<BbAssistCard["confidenceBand"], string> = {
  high: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-slate-100 text-slate-700",
};

export interface BbAssistPanelProps {
  enabled: boolean;
  isLoading: boolean;
  cards: BbAssistCard[];
  isEmpty: boolean;
  workspaceId: string;
  campaignId: string;
  organizationId: string | null;
  stepKind: string | null;
  onRefresh: () => void;
  /** Append-only — must never replace existing notes. */
  onInsertIntoNotes: (text: string) => void;
  lastRefreshedAt: string | null;
}

function formatInsert(card: BbAssistCard): string {
  // Clearly attributable to Business Brain assist; safe to append.
  const parts = [`[Business Brain · ${KIND_LABEL[card.kind]}] ${card.title}`];
  if (card.action) parts.push(`  ${card.action}`);
  return parts.join("\n");
}

export function BbAssistPanel({
  enabled,
  isLoading,
  cards,
  isEmpty,
  workspaceId,
  campaignId,
  organizationId,
  stepKind,
  onRefresh,
  onInsertIntoNotes,
  lastRefreshedAt,
}: BbAssistPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  if (!enabled) return null;

  function toggle(id: string) {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
    if (!expanded[id]) {
      const card = cards.find((c) => c.id === id);
      emitBbEvent("bb_assist_card_opened", {
        workspaceId,
        organizationId,
        campaignId,
        stepKind: stepKind ?? undefined,
        cardKind: card?.kind,
        entityType: card?.entityType,
        factId: card?.factId,
      });
    }
  }

  async function handleCopy(card: BbAssistCard) {
    try {
      // Copies the privacy-safe action line, not any source title or snippet.
      await navigator.clipboard.writeText(`${card.title} — ${card.action}`);
      setCopied(card.id);
      setTimeout(() => setCopied((c) => (c === card.id ? null : c)), 1200);
    } catch {
      /* clipboard unavailable; ignored */
    }
    emitBbEvent("bb_assist_card_copied", {
      workspaceId,
      organizationId,
      campaignId,
      stepKind: stepKind ?? undefined,
      cardKind: card.kind,
      entityType: card.entityType,
      factId: card.factId,
    });
  }

  function handleInsert(card: BbAssistCard) {
    onInsertIntoNotes(formatInsert(card));
    emitBbEvent("bb_assist_card_inserted", {
      workspaceId,
      organizationId,
      campaignId,
      stepKind: stepKind ?? undefined,
      cardKind: card.kind,
      entityType: card.entityType,
      factId: card.factId,
    });
  }

  return (
    <RunnerSurface className="overflow-hidden" data-testid="bb-assist-panel">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider truncate">
            Knowledge assist
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {cards.length}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={onRefresh}
          aria-label="Refresh assist"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            Loading approved knowledge…
          </p>
        ) : isEmpty ? (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center space-y-2">
            <p>No matching approved knowledge for this step yet.</p>
            <a
              href={`/w/${workspaceId}/brain/approved`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open Business Brain <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          cards.map((card) => {
            const open = !!expanded[card.id];
            const factLink = buildBbFactDeepLink(workspaceId, card.factId);
            const sourceLink = buildBbSourceDeepLink(workspaceId, card.sourceIds[0] ?? null);
            return (
              <article
                key={card.id}
                className="rounded-md border bg-card p-2 space-y-1.5"
                data-testid="bb-assist-card"
                data-card-kind={card.kind}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(card.id)}
                    className="flex items-start gap-1.5 text-left min-w-0 flex-1"
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                          {KIND_LABEL[card.kind]}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("text-[9px]", BAND_CLS[card.confidenceBand])}
                        >
                          {card.confidenceBand}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-semibold mt-1 leading-snug truncate">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {card.action}
                      </p>
                    </div>
                  </button>
                </div>

                {open ? (
                  <div className="space-y-1.5 pl-4">
                    <p className="text-[11px] text-foreground">{card.action}</p>
                    {card.snippet ? (
                      <blockquote className="text-[11px] italic text-muted-foreground border-l-2 border-muted-foreground/20 pl-2 line-clamp-3">
                        “{card.snippet}”
                      </blockquote>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {card.verificationState === "approved" ? (
                          <span className="inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                            Needs review
                          </span>
                        )}
                        <span>
                          · Reviewed {new Date(card.lastReviewedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => handleCopy(card)}
                          aria-label="Copy assist line"
                        >
                          <Copy className="h-3 w-3" />
                          {copied === card.id ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => handleInsert(card)}
                          aria-label="Insert into notes"
                        >
                          <ClipboardPlus className="h-3 w-3" />
                          Insert
                        </Button>
                        <a
                          href={factLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          aria-label="Open fact in Business Brain"
                        >
                          Open <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        {card.sourceIds[0] ? (
                          <a
                            href={sourceLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary"
                            aria-label="Open source"
                          >
                            Source
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {lastRefreshedAt ? (
        <footer className="px-3 py-1.5 border-t text-[10px] text-muted-foreground bg-muted/20">
          Updated {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </footer>
      ) : null}
    </RunnerSurface>
  );
}

export default BbAssistPanel;
