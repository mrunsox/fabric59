/**
 * Business Brain — Search page (Phase 3).
 *
 * Operator-focused internal search console. Approved facts are the primary
 * answer surface; orphan source chunks appear only when no approved fact
 * covers the query. needs_review is an explicit reviewer/admin opt-in,
 * never the default operator view.
 */
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  searchApprovedKnowledge,
  triggerBbBackfill,
  type BbSearchCard,
  type BbSearchResponse,
} from "@/lib/business-brain/selectors";
import { BB_ENTITY_TYPES, type BbEntityType } from "@/lib/business-brain/types";
import { ENTITY_LABEL } from "@/lib/business-brain/entitySchemas";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import { logGapSignal } from "@/lib/business-brain/gapLogging";
import { BbSourceCard } from "@/components/business-brain/BbSourceCard";
import { BbStateBlock } from "@/components/business-brain/BbStateBlock";
import { toast } from "sonner";

const GROUP_LABEL: Record<string, string> = {
  _evidence: "Supporting evidence",
  _other: "Other",
};

export default function BrainSearchPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { organization, isMasterAdmin, isWorkspaceAdmin } = useAuth();
  const orgId = organization?.id ?? null;
  const canReindex = isMasterAdmin || isWorkspaceAdmin;

  const [draftQuery, setDraftQuery] = useState("");
  const [entityType, setEntityType] = useState<"all" | BbEntityType>("all");
  const [includeNeedsReview, setIncludeNeedsReview] = useState(false);
  const [results, setResults] = useState<BbSearchResponse | null>(null);

  const search = useMutation({
    mutationFn: async (query: string) => {
      if (!workspaceId) throw new Error("No workspace");
      return searchApprovedKnowledge({
        workspaceId,
        query,
        entityTypes: entityType === "all" ? undefined : [entityType],
        includeNeedsReview,
        limit: 12,
      });
    },
    onSuccess: (r, query) => {
      setResults(r);
      const filterCount =
        (entityType !== "all" ? 1 : 0) + (includeNeedsReview ? 1 : 0);
      emitBbEvent("bb_search_query_submitted", {
        workspaceId,
        organizationId: orgId,
        queryLength: query.length,
        filterCount,
        resultCount: r.counts.total,
        factCount: r.counts.facts,
        chunkCount: r.counts.chunks,
        latencyMs: r.latencyMs,
      });
      // Phase 7 — log unanswered / low-confidence queries as gap signals.
      const noResults = r.counts.total === 0;
      const lowConfidence =
        r.counts.facts === 0 && r.counts.chunks > 0; // only orphan evidence
      if (workspaceId && (noResults || lowConfidence)) {
        logGapSignal({
          workspaceId,
          channel: "search",
          rawQuery: query,
          context: {
            reason: noResults ? "no_results" : "low_confidence",
            entityType: entityType === "all" ? null : entityType,
            includeNeedsReview,
          },
        });
        emitBbEvent("bb_gap_event_logged", {
          workspaceId,
          organizationId: orgId,
          channel: "search",
          contextKind: noResults ? "no_results" : "low_confidence",
        });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Search failed"),
  });

  const reindex = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      emitBbEvent("bb_search_reindex_started", {
        workspaceId,
        organizationId: orgId,
        embedTarget: "both",
      });
      return triggerBbBackfill(workspaceId);
    },
    onSuccess: (r) => {
      emitBbEvent("bb_embed_run_completed", {
        workspaceId,
        organizationId: orgId,
        embedTarget: "both",
        embedded: r.facts + r.chunks,
        failed: r.failed,
        outcome: r.ok ? "ok" : "fail",
      });
      if (r.ok) {
        toast.success(`Reindexed ${r.facts} facts and ${r.chunks} chunks.`);
      } else {
        toast.error("Reindex failed.");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Reindex failed"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = draftQuery.trim();
    if (!q) return;
    search.mutate(q);
  }

  const groupedKeys = useMemo(() => {
    if (!results) return [];
    // Fact groups first (ordered by group size), then evidence.
    const factKeys = Object.keys(results.groups)
      .filter((k) => !k.startsWith("_"))
      .sort((a, b) => (results.groups[b]?.length ?? 0) - (results.groups[a]?.length ?? 0));
    const evidenceKeys = Object.keys(results.groups).filter((k) => k.startsWith("_"));
    return [...factKeys, ...evidenceKeys];
  }, [results]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Search the Business Brain</h2>
        <p className="text-sm text-muted-foreground">
          Semantic search across approved knowledge. Approved facts come first;
          source snippets fill in when no fact covers the answer.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ask a question or describe what you need…"
            className="pl-9"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            maxLength={500}
          />
        </div>
        <Select value={entityType} onValueChange={(v) => setEntityType(v as typeof entityType)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {BB_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={includeNeedsReview}
            onCheckedChange={(v) => setIncludeNeedsReview(v === true)}
          />
          Include needs review
        </label>
        <Button type="submit" disabled={search.isPending || !draftQuery.trim()}>
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
        {canReindex ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => reindex.mutate()}
            disabled={reindex.isPending}
            title="Embed any approved facts and chunks that don't have a vector yet."
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${reindex.isPending ? "animate-spin" : ""}`} />
            Reindex search
          </Button>
        ) : null}
      </form>

      {search.isPending ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
        </div>
      ) : results === null ? (
        <BbStateBlock
          kind="empty"
          data-testid="bb-search-initial"
          title="Search the Business Brain."
          description="Try a real caller question, a service name, or a policy keyword. Approved facts come first."
        />
      ) : results.cards.length === 0 ? (
        <BbStateBlock
          kind="noData"
          data-testid="bb-search-no-results"
          title="No approved knowledge matched that query."
          description={
            <>
              We logged this question so reviewers can close the gap.
              {canReindex ? (
                <>
                  {" "}If you just approved facts, click <strong>Reindex search</strong>{" "}
                  so they can be retrieved.
                </>
              ) : null}
            </>
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {canReindex ? (
                <Button asChild size="sm" variant="default">
                  <Link
                    to={`/w/${workspaceId}/brain/suggested`}
                    data-testid="bb-search-propose-fact"
                  >
                    Propose this as a fact
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={`/w/${workspaceId}/brain/governance`}
                    data-testid="bb-search-open-governance"
                  >
                    Open Governance
                  </Link>
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground">
            {results.counts.facts} fact{results.counts.facts === 1 ? "" : "s"}
            {results.counts.chunks > 0
              ? `, ${results.counts.chunks} supporting snippet${results.counts.chunks === 1 ? "" : "s"}`
              : ""}{" "}
            · {results.latencyMs}ms
          </div>
          {groupedKeys.map((key) => {
            const cards = results.groups[key] ?? [];
            if (cards.length === 0) return null;
            const label =
              GROUP_LABEL[key] ?? ENTITY_LABEL[key as BbEntityType] ?? key;
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {label}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {cards.length}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {cards.map((c, i) => (
                    <BbSourceCard
                      key={`${c.kind}:${c.id}`}
                      card={c as BbSearchCard}
                      rank={i}
                      workspaceId={workspaceId ?? ""}
                      organizationId={orgId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
