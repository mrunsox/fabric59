import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { markFactNeedsUpdate, markFactReviewed, type StaleFactView } from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { toast } from "sonner";

interface Props {
  fact: StaleFactView | null;
  onClose: () => void;
  onChanged?: () => void;
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
          <SheetTitle>{fact.displayName}</SheetTitle>
          <SheetDescription>{fact.entityType}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground">Reasons</div>
            <div className="flex flex-wrap gap-1.5">
              {fact.staleReasons.length === 0 ? (
                <Badge variant="secondary">Fresh</Badge>
              ) : (
                fact.staleReasons.map((r) => (
                  <Badge key={r} variant="secondary" className="bg-amber-100 text-amber-900">
                    {r.replaceAll("_", " ")}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Last reviewed</div>
              <div>{new Date(fact.lastReviewedAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Last used</div>
              <div>{fact.lastUsedAt ? new Date(fact.lastUsedAt).toLocaleDateString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Review interval</div>
              <div>{fact.intervalDays != null ? `${fact.intervalDays} days` : "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Usage score</div>
              <div>{fact.usageScore.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">Usage breakdown</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
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
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This fact has an open conflict. "Mark reviewed" will not clear it — resolve the conflict explicitly.
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onReviewed}>Mark reviewed</Button>
            <Button size="sm" variant="outline" onClick={onNeedsUpdate}>Mark needs update</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
