import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { resolveConflict, type ConflictView } from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { toast } from "sonner";
import { BrainBadge } from "@/components/business-brain/ui";

interface Props {
  conflict: ConflictView | null;
  onClose: () => void;
  onResolved?: () => void;
}

export default function BbConflictDrawer({ conflict, onClose, onResolved }: Props) {
  const { organization } = useAuth();
  if (!conflict) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>;

  async function act(resolution: "supersede" | "keep_both" | "dismiss") {
    const ok = await resolveConflict(conflict!.id, resolution);
    if (!ok) return toast.error("Could not resolve");
    emitBbEvent("bb_conflict_resolved", {
      workspaceId: conflict!.workspaceId,
      organizationId: organization?.id ?? null,
      conflictId: conflict!.id,
      conflictKind: conflict!.conflictKind,
      entityType: conflict!.entityType,
      resolution,
    });
    toast.success("Conflict updated.");
    onResolved?.();
    onClose();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-xl overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Governance · Conflict
          </div>
          <SheetTitle className="text-lg">Conflict review</SheetTitle>
          <SheetDescription className="bb-tnum">
            {conflict.conflictKind.replace(/_/g, " ")}
            {conflict.similarity != null ? ` · similarity ${conflict.similarity.toFixed(2)}` : ""}
            {" · "}
            {conflict.entityType}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[conflict.primaryFact, conflict.conflictingFact].map((f, idx) =>
            f ? (
              <article key={f.id} className="bb-panel p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">{f.displayName}</span>
                  <BrainBadge tone="info">{idx === 0 ? "A" : "B"}</BrainBadge>
                </div>
                <div className="mb-2 text-xs text-muted-foreground">
                  {f.entityType} · reviewed {new Date(f.lastReviewedAt).toLocaleDateString()}
                </div>
                <pre className="max-h-48 overflow-auto rounded border border-bb-border-subtle bg-bb-surface-inset p-2 text-[11px] text-foreground/85">
                  {JSON.stringify(f.payload, null, 2)}
                </pre>
              </article>
            ) : (
              <div key={idx} className="bb-panel p-3 text-sm text-muted-foreground">
                Fact unavailable
              </div>
            ),
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("supersede")}>Mark A as duplicate &amp; supersede</Button>
          <Button size="sm" variant="outline" onClick={() => act("keep_both")}>Keep both</Button>
          <Button size="sm" variant="ghost" onClick={() => act("dismiss")}>Dismiss conflict</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
