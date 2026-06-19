import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { ENTITY_LABEL } from "@/lib/business-brain/entitySchemas";
import type { BbVerticalGap } from "@/lib/business-brain/types";
import { ChevronRight } from "lucide-react";

interface Props {
  factId: string | null;
  factDisplayName: string | null;
  gaps: BbVerticalGap[];
  open: boolean;
  onClose: () => void;
}

const GAP_KIND_LABEL: Record<string, string> = {
  missing_entity: "Missing entity",
  missing_field: "Missing field",
  under_min_count: "Under required count",
};

/**
 * Reviewer-facing drawer that lists unmet vertical requirements for a single
 * fact. No auto-fix — only guided navigation back to the fact editor.
 */
export default function BbGapDrawer({
  factId,
  factDisplayName,
  gaps,
  open,
  onClose,
}: Props) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const myGaps = useMemo(
    () => gaps.filter((g) => g.factId === factId && g.status === "open"),
    [gaps, factId],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vertical gaps</SheetTitle>
          <SheetDescription>
            {factDisplayName ? `Unmet requirements for "${factDisplayName}".` : "Unmet requirements."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {myGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open gaps for this fact.</p>
          ) : (
            myGaps.map((g) => (
              <div key={g.id} className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="bg-rose-100 text-rose-900">
                    {GAP_KIND_LABEL[g.gapKind] ?? g.gapKind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ENTITY_LABEL[g.entityType] ?? g.entityType}
                  </span>
                </div>
                {g.fieldPath ? (
                  <div className="text-xs text-muted-foreground">
                    Field: <code className="rounded bg-muted px-1.5 py-0.5">{g.fieldPath}</code>
                  </div>
                ) : null}
                {g.validationHint ? (
                  <p className="mt-1 text-sm">{g.validationHint}</p>
                ) : null}
              </div>
            ))
          )}
          {factId ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              data-testid="bb-gap-drawer-edit-fact"
              onClick={() => {
                // Phase 1 workflow continuity: thread `from=gap:<factId>` so
                // the destination can render a back-chip and return here.
                navigate(
                  `/w/${workspaceId}/brain/approved?fact=${factId}&from=gap:${factId}`,
                );
                onClose();
              }}
            >
              Edit fact
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
