import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, GitMerge, Loader2, Search } from "lucide-react";
import {
  useBbExtractions,
  useBbFacts,
  useBbSources,
  useBbApproveExtraction,
  useBbRejectExtraction,
  type BbExtractionRow,
  type BbFactRow,
} from "@/hooks/useBusinessBrain";
import { ENTITY_LABEL, canonicalKey } from "@/lib/business-brain/entitySchemas";
import { BB_ENTITY_TYPES } from "@/lib/business-brain/types";
import type { BbEntityType } from "@/lib/business-brain/types";

type ConfidenceBand = "all" | "high" | "med" | "low";

function bandOf(value: number): "high" | "med" | "low" {
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "med";
  return "low";
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tier = bandOf(value);
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
  const { data: sources = [] } = useBbSources(workspaceId ?? null);
  const [filter, setFilter] = useState<"all" | BbEntityType>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [bandFilter, setBandFilter] = useState<ConfidenceBand>("all");
  const [mergeTarget, setMergeTarget] = useState<{ ext: BbExtractionRow; autoCandidates: BbFactRow[] } | null>(null);
  const approve = useBbApproveExtraction();
  const reject = useBbRejectExtraction();

  const sourceTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sources) m.set(s.id, s.title);
    return m;
  }, [sources]);

  const suggested = useMemo(
    () => extractions.filter((e) => e.review_status === "suggested"),
    [extractions],
  );
  const filtered = useMemo(
    () =>
      suggested.filter((e) => {
        if (filter !== "all" && e.entity_type !== filter) return false;
        if (sourceFilter !== "all" && e.source_id !== sourceFilter) return false;
        if (bandFilter !== "all" && bandOf(e.confidence) !== bandFilter) return false;
        return true;
      }),
    [suggested, filter, sourceFilter, bandFilter],
  );

  function findKeyDuplicates(ext: BbExtractionRow): BbFactRow[] {
    const key = canonicalKey(ext.entity_type as BbEntityType, ext.payload);
    return facts.filter(
      (f) => f.entity_type === ext.entity_type && f.canonical_key === key,
    );
  }

  function handleApprove(ext: BbExtractionRow) {
    if (!workspaceId) return;
    const dupes = findKeyDuplicates(ext);
    if (dupes.length > 0) {
      setMergeTarget({ ext, autoCandidates: dupes });
      return;
    }
    approve.mutate({ extractionId: ext.id, workspaceId });
  }

  const distinctSourcesInQueue = useMemo(() => {
    const ids = new Set<string>();
    for (const e of suggested) ids.add(e.source_id);
    return Array.from(ids);
  }, [suggested]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Suggested facts</h2>
          <p className="text-sm text-muted-foreground">
            Review extractions before they enter approved knowledge. Approval creates a new fact or merges into one you select.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types ({suggested.length})</SelectItem>
              {BB_ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ENTITY_LABEL[t]} ({suggested.filter((e) => e.entity_type === t).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {distinctSourcesInQueue.map((id) => (
                <SelectItem key={id} value={id}>
                  {sourceTitleById.get(id) ?? id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bandFilter} onValueChange={(v) => setBandFilter(v as ConfidenceBand)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Confidence" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All confidence</SelectItem>
              <SelectItem value="high">High (≥80%)</SelectItem>
              <SelectItem value="med">Medium (50–79%)</SelectItem>
              <SelectItem value="low">Low (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading suggestions…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
          No suggestions match these filters.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ext) => {
            const dupes = findKeyDuplicates(ext);
            return (
              <Card key={ext.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {ENTITY_LABEL[ext.entity_type as BbEntityType] ?? ext.entity_type}
                      </Badge>
                      <ConfidenceBadge value={ext.confidence} />
                      <span className="text-xs text-muted-foreground">
                        from {sourceTitleById.get(ext.source_id) ?? "source"}
                      </span>
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
                    <Button size="sm" onClick={() => handleApprove(ext)} disabled={approve.isPending}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMergeTarget({ ext, autoCandidates: dupes })}
                    >
                      <GitMerge className="mr-1 h-4 w-4" /> Merge…
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
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
        allFacts={facts}
        onClose={() => setMergeTarget(null)}
      />
    </div>
  );
}

function MergeDialog({
  open,
  workspaceId,
  target,
  allFacts,
  onClose,
}: {
  open: boolean;
  workspaceId: string;
  target: { ext: BbExtractionRow; autoCandidates: BbFactRow[] } | null;
  allFacts: BbFactRow[];
  onClose: () => void;
}) {
  const approve = useBbApproveExtraction();
  const [chosen, setChosen] = useState<string>("");
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    if (!target) return [];
    const sameType = allFacts.filter((f) => f.entity_type === target.ext.entity_type);
    const term = search.trim().toLowerCase();
    const matched = term
      ? sameType.filter(
          (f) =>
            f.display_name.toLowerCase().includes(term) ||
            f.canonical_key.toLowerCase().includes(term),
        )
      : sameType;
    // Always surface key-collision candidates at the top.
    const autoIds = new Set(target.autoCandidates.map((c) => c.id));
    return [
      ...target.autoCandidates,
      ...matched.filter((f) => !autoIds.has(f.id)),
    ].slice(0, 20);
  }, [target, allFacts, search]);

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
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Merge into existing fact</DialogTitle>
          <DialogDescription>
            Pick an existing approved fact to merge this suggestion into. The fact's source list grows; no duplicate is created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved facts of this type yet. Cancel and approve as a new fact instead.
              </p>
            ) : (
              candidates.map((f) => {
                const isAuto = target.autoCandidates.some((c) => c.id === f.id);
                return (
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{f.display_name}</span>
                        {isAuto ? (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-900">
                            same identity key
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.source_refs.length} existing source{f.source_refs.length === 1 ? "" : "s"} · last reviewed {new Date(f.last_reviewed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
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
