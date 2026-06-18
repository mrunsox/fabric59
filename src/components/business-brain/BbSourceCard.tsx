/**
 * BbSourceCard — reusable card surface for approved-knowledge results.
 *
 * Used by:
 *   - Business Brain Search results (primary)
 *   - Approved Knowledge snippet drawer (optional reuse)
 *
 * The card shows the primary answer, supporting snippets, confidence band,
 * review status, and a compact source/version line. Interactions are
 * intentionally local (open detail, mark useful/not useful) — no mutations
 * of governed facts happen here. Telemetry is privacy-safe.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BbSearchCard } from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";

interface BbSourceCardProps {
  card: BbSearchCard;
  rank?: number;
  workspaceId: string;
  organizationId: string | null;
  onOpen?: (card: BbSearchCard) => void;
}

const BAND_CLS: Record<NonNullable<BbSearchCard["confidenceBand"]>, string> = {
  high: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-slate-100 text-slate-700",
};

export function BbSourceCard({
  card,
  rank,
  workspaceId,
  organizationId,
  onOpen,
}: BbSourceCardProps) {
  const [marked, setMarked] = useState<"useful" | "not_useful" | null>(null);

  function fireMark(useful: boolean) {
    setMarked(useful ? "useful" : "not_useful");
    emitBbEvent("bb_search_result_marked", {
      workspaceId,
      organizationId,
      hitKind: card.kind,
      rank,
      useful,
      factId: card.factId ?? undefined,
      entityType: card.entityType ?? undefined,
    });
  }

  function fireOpen() {
    emitBbEvent("bb_search_result_opened", {
      workspaceId,
      organizationId,
      hitKind: card.kind,
      rank,
      factId: card.factId ?? undefined,
      entityType: card.entityType ?? undefined,
    });
    onOpen?.(card);
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-sm leading-tight">{card.title}</h4>
            {card.entityType ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {card.entityType.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {card.kind === "chunk" ? (
              <Badge variant="outline" className="text-[10px]">Evidence</Badge>
            ) : null}
          </div>
          {card.snippet ? (
            <p className="text-sm text-muted-foreground line-clamp-3">{card.snippet}</p>
          ) : null}
        </div>
        {card.confidenceBand ? (
          <Badge
            variant="secondary"
            className={cn("shrink-0 text-[10px]", BAND_CLS[card.confidenceBand])}
          >
            {card.confidenceBand}
          </Badge>
        ) : null}
      </div>

      {card.evidence.length > 0 ? (
        <div className="space-y-1.5 border-l-2 border-muted-foreground/20 pl-3">
          {card.evidence.slice(0, 2).map((ev) => (
            <div key={`${ev.sourceId}-${ev.snippet.slice(0, 24)}`} className="text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="font-medium">{ev.sourceTitle ?? "Source"}</span>
                {ev.sourceKind ? <span>· {ev.sourceKind.replace(/_/g, " ")}</span> : null}
              </div>
              <p className="text-xs italic text-muted-foreground line-clamp-2">
                “{ev.snippet}”
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {card.verificationState === "approved" ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Approved
            </span>
          ) : card.verificationState === "needs_review" ? (
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" /> Needs review
            </span>
          ) : null}
          {card.lastReviewedAt ? (
            <span>
              Reviewed {new Date(card.lastReviewedAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={marked === "useful" ? "default" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => fireMark(true)}
            aria-label="Mark useful"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={marked === "not_useful" ? "default" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => fireMark(false)}
            aria-label="Mark not useful"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
          {onOpen ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={fireOpen}>
              Open
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default BbSourceCard;
