import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Link as LinkIcon, Search, Eye } from "lucide-react";
import {
  useBbFacts,
  useBbSources,
  type BbFactRow,
} from "@/hooks/useBusinessBrain";
import { ENTITY_LABEL } from "@/lib/business-brain/entitySchemas";
import { BB_ENTITY_TYPES } from "@/lib/business-brain/types";
import type { BbEntityType, BbStaleState } from "@/lib/business-brain/types";
import { AlertTriangle, Clock, Activity } from "lucide-react";
import BbStaleFactDrawer from "@/components/business-brain/BbStaleFactDrawer";
import { useQueryClient } from "@tanstack/react-query";
import { type StaleFactView } from "@/lib/business-brain/selectors";

type DateRange = "all" | "7" | "30" | "90";

function VerificationBadge({ state }: { state: BbFactRow["verification_state"] }) {
  const map = {
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900" },
    needs_review: { label: "Needs review", cls: "bg-amber-100 text-amber-900" },
    stale: { label: "Stale", cls: "bg-slate-100 text-slate-700" },
  } as const;
  const e = map[state];
  return <Badge variant="secondary" className={e.cls}>{e.label}</Badge>;
}

function withinDateRange(iso: string, range: DateRange): boolean {
  if (range === "all") return true;
  const days = Number(range);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

type StaleFilter = "all" | "fresh" | "stale_due_to_age" | "stale_due_to_usage" | "stale_due_to_conflict";

const STALE_BADGE: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  stale_due_to_age: { label: "Stale (age)", cls: "bg-amber-100 text-amber-900", icon: Clock },
  stale_due_to_usage: { label: "Stale (usage)", cls: "bg-amber-100 text-amber-900", icon: Activity },
  stale_due_to_conflict: { label: "Conflict", cls: "bg-rose-100 text-rose-900", icon: AlertTriangle },
};

export default function ApprovedKnowledgePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: facts = [], isLoading } = useBbFacts(workspaceId ?? null);
  const { data: sources = [] } = useBbSources(workspaceId ?? null);
  const [filter, setFilter] = useState<"all" | BbEntityType>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>("all");
  const [staleFilter, setStaleFilter] = useState<StaleFilter>("all");
  const [drawerFact, setDrawerFact] = useState<BbFactRow | null>(null);
  const [staleDrawer, setStaleDrawer] = useState<StaleFactView | null>(null);
  const qc = useQueryClient();

  const sourceMap = useMemo(() => {
    const m = new Map<string, { title: string; created_at: string }>();
    for (const s of sources) m.set(s.id, { title: s.title, created_at: s.created_at });
    return m;
  }, [sources]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return facts.filter((f) => {
      if (f.verification_state === "stale") return false;
      if (filter !== "all" && f.entity_type !== filter) return false;
      if (!withinDateRange(f.last_reviewed_at, range)) return false;
      const ss = (f.stale_state as BbStaleState | undefined) ?? "fresh";
      if (staleFilter !== "all" && ss !== staleFilter) return false;
      if (term) {
        const hay = `${f.display_name} ${f.canonical_key}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [facts, filter, search, range, staleFilter]);

  const grouped = useMemo(() => {
    const out: Record<string, BbFactRow[]> = {};
    for (const f of filtered) (out[f.entity_type] ||= []).push(f);
    return out;
  }, [filtered]);

  const visibleTypes = useMemo<BbEntityType[]>(
    () => BB_ENTITY_TYPES.filter((t) => (filter === "all" ? true : t === filter)),
    [filter],
  );

  function latestSourceDate(f: BbFactRow): string | null {
    let latest = 0;
    for (const ref of f.source_refs) {
      const s = sourceMap.get(ref.source_id);
      if (!s) continue;
      const t = new Date(s.created_at).getTime();
      if (t > latest) latest = t;
    }
    return latest ? new Date(latest).toISOString() : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Approved knowledge</h2>
          <p className="text-sm text-muted-foreground">
            Governed business memory. Every fact is reviewer-approved and source-backed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types ({facts.length})</SelectItem>
              {BB_ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ENTITY_LABEL[t]} ({facts.filter((f) => f.entity_type === t).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={staleFilter} onValueChange={(v) => setStaleFilter(v as StaleFilter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staleness</SelectItem>
              <SelectItem value="fresh">Fresh only</SelectItem>
              <SelectItem value="stale_due_to_age">Stale (age)</SelectItem>
              <SelectItem value="stale_due_to_usage">Stale (usage)</SelectItem>
              <SelectItem value="stale_due_to_conflict">Conflicts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading approved knowledge…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
          No approved facts match these filters.
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleTypes.map((t) => {
            const rows = grouped[t] ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={t} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {ENTITY_LABEL[t]}
                  <span className="ml-2 text-xs font-normal">({rows.length})</span>
                </h3>
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Details</th>
                        <th className="px-4 py-2 font-medium">Sources</th>
                        <th className="px-4 py-2 font-medium">Latest import</th>
                        <th className="px-4 py-2 font-medium">Verification</th>
                        <th className="px-4 py-2 font-medium">Reviewed</th>
                        <th className="px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => {
                        const latest = latestSourceDate(f);
                        return (
                          <tr key={f.id} className="border-b last:border-0 align-top">
                            <td className="px-4 py-3 font-medium">{f.display_name}</td>
                            <td className="px-4 py-3">
                              <pre className="max-w-[24rem] overflow-x-auto text-xs text-muted-foreground">
                                {JSON.stringify(f.payload, null, 0)}
                              </pre>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                {f.source_refs.length}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {latest ? new Date(latest).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <VerificationBadge state={f.verification_state} />
                                {f.stale_state && f.stale_state !== "fresh" ? (
                                  <button
                                    onClick={() => {
                                      const v: StaleFactView = {
                                        id: f.id,
                                        workspaceId: f.workspace_id,
                                        entityType: f.entity_type,
                                        displayName: f.display_name,
                                        staleState: f.stale_state ?? "fresh",
                                        staleReasons: (f.stale_reasons ?? []) as never,
                                        lastReviewedAt: f.last_reviewed_at,
                                        lastUsedAt: f.last_used_at ?? null,
                                        intervalDays: f.expected_review_interval_days ?? null,
                                        usageScore: 0,
                                        usageBreakdown: {
                                          searchOpens: 0, searchMarkedUseful: 0, searchMarkedNotUseful: 0,
                                          ascUsed: 0, ascDismissed: 0,
                                          assistOpened: 0, assistCopied: 0, assistInserted: 0,
                                        },
                                      };
                                      setStaleDrawer(v);
                                    }}
                                    className="text-left"
                                  >
                                    {(() => {
                                      const cfg = STALE_BADGE[f.stale_state];
                                      if (!cfg) return null;
                                      const I = cfg.icon;
                                      return (
                                        <Badge variant="secondary" className={cfg.cls + " cursor-pointer text-[10px]"}>
                                          <I className="mr-1 h-3 w-3" />
                                          {cfg.label}
                                        </Badge>
                                      );
                                    })()}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(f.last_reviewed_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant="ghost" onClick={() => setDrawerFact(f)}>
                                <Eye className="mr-1 h-3.5 w-3.5" /> Snippets
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      <Sheet open={!!drawerFact} onOpenChange={(o) => !o && setDrawerFact(null)}>
        <SheetContent className="w-full max-w-md overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{drawerFact?.display_name}</SheetTitle>
            <SheetDescription>
              Source snippets backing this approved fact.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {(drawerFact?.source_refs ?? []).map((ref, i) => {
              const s = sourceMap.get(ref.source_id);
              return (
                <Card key={`${ref.source_id}-${ref.extraction_id ?? i}`} className="p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{s?.title ?? "Source"}</span>
                    {s ? (
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-xs italic text-muted-foreground">
                    “{ref.snippet ?? "(no snippet recorded)"}”
                  </blockquote>
                </Card>
              );
            })}
            {(drawerFact?.source_refs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No source snippets recorded.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <BbStaleFactDrawer
        fact={staleDrawer}
        onClose={() => setStaleDrawer(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["bb_facts"] })}
      />
    </div>
  );
}
