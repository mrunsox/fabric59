/**
 * AscOriginPanel — Phase 5 · Slice 1.
 *
 * Source of truth for handoff behavior: docs/asc-architecture.md
 *
 *
 * Renders ASC handoff provenance + structured carry-over inside the
 * canonical builder. Read-only by design except for:
 *   - dismissing follow-ups (presentation-scoped reviewState only)
 *   - explicit, additive "Insert" actions that the user triggers
 *
 * This panel never overwrites existing canonical edits. It is the
 * durable surface for ASC origin context — it survives autosave + route
 * transitions because it reads from `intake.ascOrigin` (persisted in
 * `intake_data` JSONB), not from router state.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, ExternalLink, Copy, Plus, Info } from "lucide-react";
import type { CampaignIntakeData } from "@/types/campaign";
import { toast } from "sonner";

interface Props {
  workspaceId: string;
  ascOrigin: NonNullable<CampaignIntakeData["ascOrigin"]>;
  existingNewDispositions: string[];
  onUpdateAscOrigin: (
    next: NonNullable<CampaignIntakeData["ascOrigin"]>,
  ) => void;
  onAddNewDispositions: (labels: string[]) => void;
}

export function AscOriginPanel({
  workspaceId,
  ascOrigin,
  existingNewDispositions,
  onUpdateAscOrigin,
  onAddNewDispositions,
}: Props) {
  const carried = ascOrigin.carried;
  const followUps = ascOrigin.followUps ?? [];
  const dismissedIds = useMemo(
    () => new Set(ascOrigin.reviewState?.followUpsDismissedIds ?? []),
    [ascOrigin.reviewState?.followUpsDismissedIds],
  );

  const [showAll, setShowAll] = useState(false);
  const visibleFollowUps = showAll
    ? followUps
    : followUps.filter((f) => !dismissedIds.has(f.id));

  const toggleDismiss = (id: string) => {
    const next = new Set(dismissedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onUpdateAscOrigin({
      ...ascOrigin,
      reviewState: {
        ...(ascOrigin.reviewState ?? {}),
        followUpsDismissedIds: Array.from(next),
      },
    });
  };

  const handleInsertReasonsAsDispositions = () => {
    const labels = (carried?.callerReasons ?? [])
      .map((r) => r.label.trim())
      .filter(Boolean);
    const existingLower = new Set(
      existingNewDispositions.map((s) => s.toLowerCase()),
    );
    const additive = labels.filter((l) => !existingLower.has(l.toLowerCase()));
    if (additive.length === 0) {
      toast.info("All caller reasons are already present as dispositions.");
      return;
    }
    onAddNewDispositions(additive);
    toast.success(`Added ${additive.length} disposition candidate(s).`);
  };

  const handleCopySlug = async () => {
    if (!carried?.launchSlug) return;
    try {
      await navigator.clipboard.writeText(carried.launchSlug);
      toast.success("Launch slug copied.");
    } catch {
      toast.error("Could not copy slug.");
    }
  };

  const ascDraftHref = `/w/${workspaceId}/campaigns/asc?setupId=${encodeURIComponent(
    ascOrigin.ascDraftId,
  )}`;

  const dismissedCount = followUps.filter((f) => dismissedIds.has(f.id)).length;

  return (
    <Card
      data-testid="asc-origin-panel"
      className="border-primary/30 bg-primary/5"
    >
      <CardContent className="py-4 space-y-4">
        {/* Banner */}
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">Handed off from ASC</h3>
              <Badge variant="outline" className="text-[10px]">
                ASC did not publish
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="asc-origin-no-sync-copy">
              This campaign was drafted in ASC. Changes here do not sync back
              to ASC. Final review and publish happen here in the canonical
              builder. The fields below are provenance only — edits to
              canonical sections above remain the source of record.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 px-2 text-xs"
              >
                <a href={ascDraftHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View original ASC draft
                </a>
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Forked {new Date(ascOrigin.forkedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Carried context */}
        {carried && (
          <div className="rounded-md border bg-background/60 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Carried from ASC
              </h4>
            </div>

            {(carried.primaryOutcome || carried.secondaryOutcome) && (
              <div className="text-xs space-y-1">
                {carried.primaryOutcome && (
                  <div>
                    <span className="text-muted-foreground">Primary outcome: </span>
                    <span className="font-medium">{carried.primaryOutcome}</span>
                  </div>
                )}
                {carried.secondaryOutcome && (
                  <div>
                    <span className="text-muted-foreground">Secondary outcome: </span>
                    <span className="font-medium">{carried.secondaryOutcome}</span>
                  </div>
                )}
              </div>
            )}

            {carried.callerReasons && carried.callerReasons.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Caller reasons ({carried.callerReasons.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {carried.callerReasons.map((r, i) => (
                    <Badge
                      key={r.id ?? `${r.label}-${i}`}
                      variant="secondary"
                      className="text-[11px]"
                    >
                      {r.label}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleInsertReasonsAsDispositions}
                  data-testid="asc-insert-dispositions"
                >
                  <Plus className="h-3 w-3" />
                  Add as new disposition candidates
                </Button>
              </div>
            )}

            {carried.destination?.kind && (
              <div className="text-xs">
                <span className="text-muted-foreground">Destination: </span>
                <span className="font-medium">{carried.destination.kind}</span>
                {carried.destination.externalUrl && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {carried.destination.externalUrl}
                  </span>
                )}
                {carried.destination.openMode && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({carried.destination.openMode})
                  </span>
                )}
              </div>
            )}

            {carried.launchSlug && (
              <div className="text-xs flex items-center gap-2">
                <span className="text-muted-foreground">Launch slug:</span>
                <code className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
                  {carried.launchSlug}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] gap-1"
                  onClick={handleCopySlug}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <div className="rounded-md border bg-background/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ASC follow-ups ({followUps.length - dismissedCount} open
                {dismissedCount > 0 ? `, ${dismissedCount} dismissed` : ""})
              </h4>
              {dismissedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "Hide dismissed" : "Show all"}
                </Button>
              )}
            </div>
            <ul className="space-y-1.5">
              {visibleFollowUps.map((f) => {
                const isDismissed = dismissedIds.has(f.id);
                return (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 text-xs"
                    data-testid={`asc-followup-${f.id}`}
                  >
                    <Checkbox
                      id={`asc-fu-${f.id}`}
                      checked={isDismissed}
                      onCheckedChange={() => toggleDismiss(f.id)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`asc-fu-${f.id}`}
                      className={`flex-1 cursor-pointer ${
                        isDismissed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      <Badge variant="outline" className="mr-1.5 text-[10px]">
                        {f.area}
                      </Badge>
                      {f.message}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
