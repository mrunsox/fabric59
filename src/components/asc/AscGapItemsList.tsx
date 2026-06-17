/**
 * ASC Slice 4 — Advisory gap items list (renders inside the side panel
 * Unresolved tab). Items are non-blocking recommendations; nothing here
 * gates navigation or publish. Dismiss is local soft-hide only.
 */
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dispatch } from "react";
import type { AscDraft, AscGapItem } from "@/lib/asc/types";
import type { AscAction, AscGapFinderStep } from "@/lib/asc/actions";
import { selectGapItemsForStep } from "@/lib/asc/selectors";

const KIND_LABEL: Record<AscGapItem["kind"], string> = {
  missing_handling: "Missing handling",
  escalation_no_destination: "Escalation has no destination",
  implied_capture_missing: "Implied info not captured",
  after_hours_no_variant: "No after-hours variant",
  duplicate_reasons: "Possible duplicate reasons",
};

export interface AscGapItemsListProps {
  draft: AscDraft;
  step: AscGapFinderStep;
  dispatch: Dispatch<AscAction>;
}

export function AscGapItemsList({ draft, step, dispatch }: AscGapItemsListProps) {
  const items = selectGapItemsForStep(draft, step);
  const reasonLabelById = new Map(
    draft.input.callerReasons.map((r) => [r.id, r.label]),
  );

  if (items.length === 0) {
    return (
      <p
        data-testid={`asc-gap-empty-${step}`}
        className="text-xs text-muted-foreground"
      >
        No recommendations for this step. Run "Check for gaps" from the step
        to look for soft issues. Nothing here blocks navigation.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid={`asc-gap-list-${step}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Recommendations — not blocking
      </p>
      <ul className="space-y-2">
        {items.map((g) => (
          <li
            key={g.id}
            data-testid={`asc-gap-item-${g.id}`}
            className="rounded-md border border-amber-300 bg-amber-50/60 px-2 py-2 text-xs"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
              <div className="flex-1 space-y-1">
                <div className="font-medium text-amber-900">
                  {KIND_LABEL[g.kind]}
                </div>
                <p className="text-amber-900/80">{g.message}</p>
                {g.reasonIds && g.reasonIds.length > 0 && (
                  <p className="text-[10px] text-amber-900/70">
                    Affected:{" "}
                    {g.reasonIds
                      .map((id) => reasonLabelById.get(id) ?? id)
                      .join(", ")}
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                aria-label="Dismiss"
                data-testid={`asc-gap-dismiss-${g.id}`}
                onClick={() =>
                  dispatch({ type: "DISMISS_GAP_ITEM", step, itemId: g.id })
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
