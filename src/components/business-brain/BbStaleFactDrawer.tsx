import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { markFactNeedsUpdate, markFactReviewed, type StaleFactView } from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { toast } from "sonner";
import { BrainBadge } from "@/components/business-brain/ui";

interface Props {
  fact: StaleFactView | null;
  onClose: () => void;
  onChanged?: () => void;
}

const REASON_TONE: Record<string, "muted" | "warn" | "bad"> = {
  stale_due_to_age: "muted",
  stale_due_to_usage: "muted",
  stale_due_to_conflict: "warn",
};

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-bb-border-subtle bg-bb-surface-inset px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 bb-tnum text-sm text-foreground">{value}</div>
    </div>
  );
}

export default function BbStaleFactDrawer({ fact, onClose, onChanged }: Props) {
  const { organization } = useAuth();
  if (!fact) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>;

  const breakdown = fact.usageBreakdown;
  const hasConflict = fact.staleReasons.includes("stale_due_to_conflict");

  async function onReviewed() {
    const ok = await markFactReviewed(fact!.id);
    if (!ok) return toast.error("Could not mark reviewed");
    emitBbEvent("bb_fact_marked_reviewed", {
      workspaceId: fact!.workspaceId,
      organizationId: organization?.id ?? null,
      factId: fact!.id,
      entityType: fact!.entityType,
      staleStateBefore: fact!.staleState,
      staleStateAfter: hasConflict ? "stale_due_to_conflict" : "fresh",
    });
    toast.success(hasConflict ? "Marked reviewed. Conflict still open." : "Marked reviewed.");
    onChanged?.();
    onClose();
  }

  async function onNeedsUpdate() {
    const ok = await markFactNeedsUpdate(fact!.id);
    if (!ok) return toast.error("Could not mark needs update");
    emitBbEvent("bb_fact_marked_needs_update", {
      workspaceId: fact!.workspaceId,
      organizationId: organization?.id ?? null,
      factId: fact!.id,
      entityType: fact!.entityType,
      staleStateBefore: fact!.staleState,
    });
    toast.success("Moved to needs review.");
    onChanged?.();
    onClose();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Governance · Stale fact
          </div>
          <SheetTitle className="text-lg">{fact.displayName}</SheetTitle>
          <SheetDescription>{fact.entityType}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 text-sm">
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Reasons
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fact.staleReasons.length === 0 ? (
                <BrainBadge tone="ok">Fresh</BrainBadge>
              ) : (
                fact.staleReasons.map((r) => (
                  <BrainBadge key={r} tone={REASON_TONE[r] ?? "warn"}>
                    {r.replace(/_/g, " ")}
                  </BrainBadge>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetaCell label="Last reviewed" value={new Date(fact.lastReviewedAt).toLocaleDateString()} />
            <MetaCell label="Last used" value={fact.lastUsedAt ? new Date(fact.lastUsedAt).toLocaleDateString() : "—"} />
            <MetaCell label="Review interval" value={fact.intervalDays != null ? `${fact.intervalDays} days` : "—"} />
            <MetaCell label="Usage score" value={fact.usageScore.toFixed(2)} />
          </div>

          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Usage breakdown
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-bb-border-subtle bg-bb-surface-inset px-3 py-2 text-xs text-foreground/90 bb-tnum">
              <div>Search opens: {breakdown.searchOpens}</div>
              <div>Useful: {breakdown.searchMarkedUseful}</div>
              <div>Not useful: {breakdown.searchMarkedNotUseful}</div>
              <div>ASC used: {breakdown.ascUsed}</div>
              <div>ASC dismissed: {breakdown.ascDismissed}</div>
              <div>Assist opened: {breakdown.assistOpened}</div>
              <div>Assist copied: {breakdown.assistCopied}</div>
              <div>Assist inserted: {breakdown.assistInserted}</div>
            </div>
          </div>

          {hasConflict ? (
            <div className="bb-panel bb-rail bb-rail-warn px-3 py-2 text-xs text-foreground/90">
              This fact has an open conflict. &ldquo;Mark reviewed&rdquo; will not clear it — resolve the conflict explicitly.
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onReviewed}>Mark reviewed</Button>
            <Button size="sm" variant="outline" onClick={onNeedsUpdate}>Mark needs update</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
