/**
 * Phase 5 — InCallKnowledgeBin
 *
 * Grouped, collapsible view of the runtime Knowledge Bin. Groups are
 * rendered in precedence order. The dispositions/routing group is rendered
 * separately as a sidecar — it is operational, not factual.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InCallSourceChip } from "./InCallSourceChip";
import type {
  KnowledgeBin,
  KnowledgeBinGroup,
  KnowledgeBinItem,
} from "@/lib/workspace/cockpit/knowledgeBin";

export interface InCallKnowledgeBinProps {
  bin: KnowledgeBin | null;
  isLoading?: boolean;
}

const FACTUAL_ORDER: Array<keyof KnowledgeBin> = [
  "caller",
  "instructions",
  "required",
  "guide",
  "approved",
  "references",
];

export function InCallKnowledgeBin({ bin, isLoading }: InCallKnowledgeBinProps) {
  if (isLoading && !bin) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-xs text-muted-foreground text-center">
        Resolving knowledge base…
      </div>
    );
  }
  if (!bin) {
    return (
      <div
        className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-xs text-muted-foreground text-center"
        data-testid="incall-bin-empty"
      >
        Knowledge base unavailable for this call.
      </div>
    );
  }

  const factualGroups = FACTUAL_ORDER.map((k) => bin[k] as KnowledgeBinGroup).filter(
    (g) => g.items.length > 0,
  );
  const totalFactual = bin.ordered.length;

  return (
    <div className="space-y-3" data-testid="incall-knowledge-bin">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Knowledge base · {totalFactual} item{totalFactual === 1 ? "" : "s"}
        </p>
        {bin.conflicts.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-amber-700"
            data-testid="incall-bin-conflict-flag"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {bin.conflicts.length} conflict{bin.conflicts.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {bin.conflicts.length > 0 && (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-800 space-y-1"
          data-testid="incall-bin-conflicts"
        >
          {bin.conflicts.slice(0, 3).map((c, i) => (
            <div key={`${c.topicKey}:${i}`} className="leading-snug">
              <span className="font-medium">{c.winner.label}</span> — {c.reason}
            </div>
          ))}
        </div>
      )}

      {factualGroups.length === 0 ? (
        <div
          className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground text-center"
          data-testid="incall-bin-missing"
        >
          No factual knowledge resolved for this call yet. Approve facts in
          Business Brain or publish the canonical guide to populate the bin.
        </div>
      ) : (
        factualGroups.map((g) => <BinGroup key={g.kind} group={g} />)
      )}

      {bin.dispositions.items.length > 0 && (
        <div className="pt-1 border-t border-border/60">
          <BinGroup group={bin.dispositions} sidecar />
        </div>
      )}
    </div>
  );
}

function BinGroup({ group, sidecar }: { group: KnowledgeBinGroup; sidecar?: boolean }) {
  const [open, setOpen] = useState(!sidecar);
  return (
    <section
      className={cn(
        "rounded-md border bg-card overflow-hidden",
        sidecar && "bg-muted/20",
      )}
      data-testid={`incall-bin-group-${group.kind}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{group.label}</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {group.items.length}
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-border/60">
          {group.items.map((it) => (
            <BinRow key={it.id} item={it} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BinRow({ item }: { item: KnowledgeBinItem }) {
  return (
    <li
      className="px-2.5 py-2 space-y-1"
      data-testid={`incall-bin-item-${item.sourceType}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium truncate">{item.label}</p>
        <InCallSourceChip
          sourceType={item.sourceType}
          precedence={
            Number.isFinite(item.precedence) ? item.precedence : undefined
          }
          scope={item.scope}
          dense
        />
      </div>
      <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {item.body}
      </p>
    </li>
  );
}
