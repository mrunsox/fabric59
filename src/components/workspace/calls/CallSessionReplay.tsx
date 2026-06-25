/**
 * Phase 7B — CallSessionReplay
 *
 * Read-only replay surface backed by `call_session_snapshots` (v1 contract).
 * Renders the captured "story of the call": caller header, lifecycle timeline,
 * outcome, and Knowledge Bin summary. AI summary + tags and (when enabled)
 * advisory QA hints are derived strictly from the loaded snapshot.
 *
 * No live DB reads are performed for the AI surfaces — the snapshot is the
 * only grounding source.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  PhoneIncoming,
  CheckCircle2,
  BookOpen,
  Sparkle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestSnapshotForSession } from "@/lib/workspace/callSessions/snapshots";
import {
  summarizeCallFromSnapshot,
  suggestQaChecksFromSnapshot,
  type CallSnapshotSummary,
  type CallSnapshotQaHints,
} from "@/lib/workspace/callSessions/aiSummaries";
import type {
  CallSessionSnapshotV1,
  SnapshotEvent,
  SnapshotKnowledgeGroup,
} from "@/lib/workspace/callSessions/snapshotContract";

export interface CallSessionReplayProps {
  sessionId: string;
  /** When true, render the advisory QA Hints panel. Default false. */
  showQaHints?: boolean;
}

const GROUP_LABEL: Record<SnapshotKnowledgeGroup["key"], string> = {
  caller: "Caller",
  instructions: "Campaign instructions",
  required: "Required fields",
  guide: "Canonical workspace guide",
  approved: "Approved facts",
  references: "Supplementary references",
  dispositions: "Routing / dispositions",
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function describeEvent(e: SnapshotEvent): string {
  if (e.type === "phase_change") {
    return `Phase changed${e.from ? ` from ${e.from}` : ""} → ${e.to}`;
  }
  if (e.type === "required_field_completed") {
    return `Required field completed: ${e.field_key}${
      e.value_preview ? ` (${e.value_preview})` : ""
    }`;
  }
  return `Disposition selected: ${e.label || "—"}`;
}

export function CallSessionReplay({ sessionId, showQaHints = false }: CallSessionReplayProps) {
  const snapQ = useQuery({
    queryKey: ["call-session-snapshot", sessionId],
    queryFn: () => getLatestSnapshotForSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  const snapshot = snapQ.data?.snapshot as CallSessionSnapshotV1 | undefined;

  if (snapQ.isLoading) {
    return (
      <div className="space-y-3" data-testid="replay-loading">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div
        className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center"
        data-testid="replay-empty"
      >
        <Clock className="h-5 w-5 mx-auto text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium mt-2">No snapshot captured for this session yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Snapshots are written when a call reaches wrap-up or completion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="replay-root">
      <ReplayHeader snapshot={snapshot} capturedAt={snapQ.data?.created_at ?? null} />
      <SummaryInsights snapshot={snapshot} capturedAt={snapQ.data?.created_at ?? null} />
      <ReplayTimeline events={snapshot.events} />
      <ReplayOutcome snapshot={snapshot} />
      <ReplayKnowledgeBin groups={snapshot.knowledge_bin?.groups ?? []} />
      {showQaHints && <QaHintsPanel snapshot={snapshot} />}
    </div>
  );
}

function ReplayHeader({
  snapshot,
  capturedAt,
}: {
  snapshot: CallSessionSnapshotV1;
  capturedAt: string | null;
}) {
  const s = snapshot.session;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PhoneIncoming className="h-4 w-4 text-primary" aria-hidden />
          {s.caller_label?.value || "Unknown caller"}
          <Badge variant="outline" className="ml-2 text-[10px]">
            {s.caller_label?.source ?? "unknown"}
          </Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {s.phase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1">
        <div>
          Started {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
          {s.ended_at && <> · Ended {new Date(s.ended_at).toLocaleString()}</>}
          {" · "}
          Duration {formatDuration(s.duration_seconds)}
        </div>
        {capturedAt && (
          <div className="text-[10px] font-mono">
            Snapshot v1 captured {new Date(capturedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryInsights({
  snapshot,
  capturedAt,
}: {
  snapshot: CallSessionSnapshotV1;
  capturedAt: string | null;
}) {
  const [state, setState] = useState<CallSnapshotSummary | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    summarizeCallFromSnapshot(snapshot)
      .then((r) => {
        if (!cancelled) setState(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  return (
    <Card data-testid="replay-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-primary" aria-hidden />
          Summary &amp; Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : state?.reason === "insufficient_data" || !state?.summary ? (
          <p className="text-xs text-muted-foreground" data-testid="replay-summary-empty">
            Not enough data in this snapshot to generate a summary.
          </p>
        ) : (
          <p className="text-sm leading-relaxed">{state.summary}</p>
        )}
        {state?.tags && state.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {state.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground italic" data-testid="replay-summary-footer">
          Generated from snapshot v1{capturedAt ? ` · captured ${new Date(capturedAt).toLocaleString()}` : ""} · advisory only.
        </p>

      </CardContent>
    </Card>
  );
}

function ReplayTimeline({ events }: { events: SnapshotEvent[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" aria-hidden /> Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="replay-timeline-empty">
            No lifecycle events captured.
          </p>
        ) : (
          <ol className="space-y-2" data-testid="replay-timeline">
            {events.map((e, i) => (
              <li
                key={`${e.ts}-${i}`}
                className="text-xs flex gap-3 items-start border-l-2 border-border pl-3"
              >
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
                <span>{describeEvent(e)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ReplayOutcome({ snapshot }: { snapshot: CallSessionSnapshotV1 }) {
  const o = snapshot.outcome;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Outcome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-sm">
          {o?.disposition_label || (
            <span className="text-muted-foreground">No disposition recorded</span>
          )}
        </div>
        {o?.notes_excerpt && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {o.notes_excerpt}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReplayKnowledgeBin({ groups }: { groups: SnapshotKnowledgeGroup[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const sorted = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          (Number.isFinite(a.precedence) ? a.precedence : 999) -
          (Number.isFinite(b.precedence) ? b.precedence : 999),
      ),
    [groups],
  );
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden /> Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="replay-kb-empty">
            No knowledge base slice in this snapshot.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="replay-kb">
            {sorted.map((g) => {
              const isOpen = openKey === g.key;
              return (
                <li key={g.key} className="border rounded-md">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-xs"
                    onClick={() => setOpenKey(isOpen ? null : g.key)}
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2">
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span className="font-medium">{GROUP_LABEL[g.key] ?? g.key}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {g.items.length} item{g.items.length === 1 ? "" : "s"}
                      </Badge>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      p{Number.isFinite(g.precedence) ? g.precedence : "∞"}
                    </span>
                  </button>
                  {isOpen && g.items.length > 0 && (
                    <ul className="px-3 pb-2 space-y-1">
                      {g.items.map((it) => (
                        <li
                          key={it.id}
                          className="text-[11px] flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{it.label || "(unnamed)"}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {it.source_type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QaHintsPanel({ snapshot }: { snapshot: CallSessionSnapshotV1 }) {
  const [state, setState] = useState<CallSnapshotQaHints | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = () => {
    setLoading(true);
    suggestQaChecksFromSnapshot(snapshot)
      .then(setState)
      .finally(() => setLoading(false));
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5" data-testid="replay-qa-hints">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
          QA Hints
          <Badge variant="outline" className="text-[10px] border-amber-600 text-amber-700">
            Advisory only — not a QA score
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!open ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(true);
              load();
            }}
          >
            Generate hints from snapshot
          </Button>
        ) : loading ? (
          <Skeleton className="h-16 w-full" />
        ) : state?.reason === "insufficient_data" || (state?.hints?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not enough data in this snapshot to suggest review hints.
          </p>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {state!.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-amber-800/80 italic">
          Hints are advisory and never auto-score or auto-pass/fail a call.
        </p>
      </CardContent>
    </Card>
  );
}
