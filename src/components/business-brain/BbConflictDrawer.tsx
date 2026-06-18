import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { resolveConflict, type ConflictView } from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { toast } from "sonner";

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
          <SheetTitle>Conflict review</SheetTitle>
          <SheetDescription>
            {conflict.conflictKind.replaceAll("_", " ")}
            {conflict.similarity != null ? ` · similarity ${conflict.similarity.toFixed(2)}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[conflict.primaryFact, conflict.conflictingFact].map((f, idx) =>
            f ? (
              <Card key={f.id} className="p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{f.displayName}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {idx === 0 ? "A" : "B"}
                  </Badge>
                </div>
                <div className="mb-2 text-xs text-muted-foreground">
                  {f.entityType} · reviewed {new Date(f.lastReviewedAt).toLocaleDateString()}
                </div>
                <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[11px]">
                  {JSON.stringify(f.payload, null, 2)}
                </pre>
              </Card>
            ) : (
              <Card key={idx} className="p-3 text-sm text-muted-foreground">Fact unavailable</Card>
            ),
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("supersede")}>Mark A as duplicate &amp; supersede</Button>
          <Button size="sm" variant="outline" onClick={() => act("keep_both")}>Keep both</Button>
          <Button size="sm" variant="ghost" onClick={() => act("dismiss")}>Dismiss conflict</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
