import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, GitMerge, Loader2 } from "lucide-react";
import {
  useBbExtractions,
  useBbFacts,
  useBbApproveExtraction,
  useBbRejectExtraction,
  type BbExtractionRow,
  type BbFactRow,
} from "@/hooks/useBusinessBrain";
import {
  BB_ENTITY_TYPES,
  ENTITY_LABEL,
  canonicalKey,
} from "@/lib/business-brain/entitySchemas";
import type { BbEntityType } from "@/lib/business-brain/types";

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tier = pct >= 80 ? "high" : pct >= 50 ? "med" : "low";
  const cls = {
    high: "bg-emerald-100 text-emerald-900",
    med: "bg-amber-100 text-amber-900",
    low: "bg-slate-100 text-slate-700",
  }[tier];
  return <Badge variant="secondary" className={cls}>{pct}% conf</Badge>;
}

export default function SuggestedFactsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: extractions = [], isLoading } = useBbExtractions(workspaceId ?? null);
  const { data: facts = [] } = useBbFacts(workspaceId ?? null);
  const [filter, setFilter] = useState<"all" | BbEntityType>("all");
  const [mergeTarget, setMergeTarget] = useState<{ ext: BbExtractionRow; candidates: BbFactRow[] } | null>(null);
  const approve = useBbApproveExtraction();
  const reject = useBbRejectExtraction();

  const suggested = useMemo(
    () => extractions.filter((e) => e.review_status === "suggested"),
    [extractions],
  );
  const filtered = useMemo(
    () => suggested.filter((e) => filter === "all" || e.entity_type === filter),
    [suggested, filter],
  );

  function findDuplicates(ext: BbExtractionRow): BbFactRow[] {
    const key = canonicalKey(ext.entity_type as BbEntityType, ext.payload);
    return facts.filter(
      (f) =>
        f.entity_type === ext.entity_type &&
        f.canonical_key === key,
    );
  }

  function handleApprove(ext: BbExtractionRow) {
    if (!workspaceId) return;
    const dupes = findDuplicates(ext);
    if (dupes.length > 0) {
      setMergeTarget({ ext, candidates: dupes });
      return;
    }
    approve.mutate({ extractionId: ext.id, workspaceId });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Suggested facts</h2>
          <p className="text-sm text-muted-foreground">
            Review extractions before they enter approved knowledge. Approval creates a new fact or merges into a duplicate you select.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types ({suggested.length})</SelectItem>
            {BB_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABEL[t]} ({suggested.filter((e) => e.entity_type === t).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading suggestions…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
          No suggestions in this queue. Ingest a source to populate it.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ext) => {
            const dupes = findDuplicates(ext);
            return (
              <Card key={ext.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ENTITY_LABEL[ext.entity_type as BbEntityType] ?? ext.entity_type}
                      </Badge>
                      <ConfidenceBadge value={ext.confidence} />
                      {dupes.length > 0 ? (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-900">
                          {dupes.length} duplicate{dupes.length > 1 ? "s" : ""} in approved
                        </Badge>
                      ) : null}
                    </div>
                    <pre className="overflow-x-auto rounded bg-muted/40 px-3 py-2 text-xs">
                      {JSON.stringify(ext.payload, null, 2)}
                    </pre>
                    {ext.snippet ? (
                      <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-xs italic text-muted-foreground">
                        “{ext.snippet}”
                      </blockquote>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(ext)}
                      disabled={approve.isPending}
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => workspaceId && reject.mutate({ extractionId: ext.id, workspaceId })}
                      disabled={reject.isPending}
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <MergeDialog
        open={!!mergeTarget}
        workspaceId={workspaceId ?? ""}
        target={mergeTarget}
        onClose={() => setMergeTarget(null)}
      />
    </div>
  );
}

function MergeDialog({
  open,
  workspaceId,
  target,
  onClose,
}: {
  open: boolean;
  workspaceId: string;
  target: { ext: BbExtractionRow; candidates: BbFactRow[] } | null;
  onClose: () => void;
}) {
  const approve = useBbApproveExtraction();
  const [chosen, setChosen] = useState<string>("");
  if (!target) return null;

  const handleMerge = async () => {
    if (!chosen) return;
    await approve.mutateAsync({
      extractionId: target.ext.id,
      workspaceId,
      mergeIntoFactId: chosen,
    });
    onClose();
    setChosen("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge or create new?</DialogTitle>
          <DialogDescription>
            One or more approved facts have the same identity key. Pick one to merge into, or cancel to refine the suggestion first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {target.candidates.map((f) => (
            <label
              key={f.id}
              className="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-muted/40"
            >
              <input
                type="radio"
                name="merge"
                value={f.id}
                checked={chosen === f.id}
                onChange={() => setChosen(f.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{f.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {f.source_refs.length} existing source{f.source_refs.length === 1 ? "" : "s"} · last reviewed {new Date(f.last_reviewed_at).toLocaleDateString()}
                </div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMerge} disabled={!chosen || approve.isPending}>
            <GitMerge className="mr-2 h-4 w-4" /> Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
