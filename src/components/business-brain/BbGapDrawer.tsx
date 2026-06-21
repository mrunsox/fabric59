import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { ENTITY_LABEL } from "@/lib/business-brain/entitySchemas";
import type { BbVerticalGap } from "@/lib/business-brain/types";
import { ChevronRight } from "lucide-react";
import { BrainBadge } from "@/components/business-brain/ui";

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
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Vertical gaps
          </div>
          <SheetTitle className="text-lg">
            {factDisplayName ?? "Unmet requirements"}
          </SheetTitle>
          <SheetDescription>
            {factDisplayName
              ? `Unmet requirements for this fact.`
              : "Unmet requirements."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-3">
          {myGaps.length === 0 ? (
            <div className="rounded-md border border-bb-border-subtle bg-bb-surface-inset px-3 py-4 text-sm text-muted-foreground">
              No open gaps for this fact.
            </div>
          ) : (
            myGaps.map((g) => (
              <div
                key={g.id}
                className="bb-panel bb-rail bb-rail-bad p-3 text-sm"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <BrainBadge tone="bad">{GAP_KIND_LABEL[g.gapKind] ?? g.gapKind}</BrainBadge>
                  <span className="text-xs text-muted-foreground">
                    {ENTITY_LABEL[g.entityType] ?? g.entityType}
                  </span>
                </div>
                {g.fieldPath ? (
                  <div className="text-xs text-muted-foreground">
                    Field:{" "}
                    <code className="rounded bg-bb-surface-inset px-1.5 py-0.5 text-foreground/80">
                      {g.fieldPath}
                    </code>
                  </div>
                ) : null}
                {g.validationHint ? (
                  <p className="mt-1.5 text-sm text-foreground">{g.validationHint}</p>
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
