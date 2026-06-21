/**
 * Phase 7 — Demand gaps section embedded in Governance.
 *
 * Surfaces clustered gap topics derived from search/ASC/assist signals.
 * Reviewers can:
 *   - Create fact draft (prefill only; never auto-approves anything)
 *   - Link to an existing fact
 *   - Dismiss or Suppress (sticky)
 *
 * The UI shows only the canonical question and aggregate metadata. Raw query
 * text is never read or rendered here (RLS-restricted by design).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  MessageSquare,
  Headphones,
  Link2,
  EyeOff,
  Trash2,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listGapTopics,
  dismissGapTopic,
  suppressGapTopic,
  triggerGapClusterRun,
  buildFactDraftLinkFromGap,
  type BbGapTopicView,
} from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import type { GapChannel } from "@/lib/business-brain/gapLogging";
import { BrainPanel, BrainBadge } from "@/components/business-brain/ui";
import BbStateBlock from "@/components/business-brain/BbStateBlock";

const CHANNEL_ICON: Record<GapChannel, typeof SearchIcon> = {
  search: SearchIcon,
  asc: MessageSquare,
  assist: Headphones,
};

const CHANNEL_LABEL: Record<GapChannel, string> = {
  search: "Search",
  asc: "ASC",
  assist: "Assist",
};

const WINDOW_DAYS = { "7": 7, "30": 30, "90": 90 } as const;

export default function BrainGapGovernanceSection() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { organization } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<"all" | GapChannel>("all");
  const [entityHint, setEntityHint] = useState<string>("all");
  const [windowDays, setWindowDays] = useState<keyof typeof WINDOW_DAYS>("30");
  const [running, setRunning] = useState(false);

  const topicsQuery = useQuery({
    queryKey: ["bb_gap_topics", workspaceId, channel, entityHint, windowDays],
    enabled: !!workspaceId,
    queryFn: () =>
      listGapTopics(workspaceId!, {
        channel: channel === "all" ? undefined : channel,
        entityTypeHint: entityHint === "all" ? undefined : entityHint,
        sinceDays: WINDOW_DAYS[windowDays],
        status: "open",
      }),
  });

  useEffect(() => {
    if (!workspaceId) return;
    emitBbEvent("bb_gap_governance_view_opened", {
      workspaceId,
      organizationId: organization?.id ?? null,
      section: "gaps",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const entityHints = useMemo(() => {
    const set = new Set<string>();
    for (const t of topicsQuery.data ?? []) {
      if (t.entityTypeHint) set.add(t.entityTypeHint);
    }
    return Array.from(set).sort();
  }, [topicsQuery.data]);

  async function runClustering() {
    if (!workspaceId) return;
    setRunning(true);
    await triggerGapClusterRun(workspaceId);
    setRunning(false);
    qc.invalidateQueries({ queryKey: ["bb_gap_topics"] });
  }

  async function onDismiss(t: BbGapTopicView) {
    const ok = await dismissGapTopic(t.id);
    if (ok) {
      emitBbEvent("bb_gap_topic_action", {
        workspaceId: workspaceId ?? null,
        organizationId: organization?.id ?? null,
        gapTopicId: t.id,
        gapTopicAction: "dismiss",
        entityType: t.entityTypeHint ?? undefined,
      });
      qc.invalidateQueries({ queryKey: ["bb_gap_topics"] });
    }
  }
  async function onSuppress(t: BbGapTopicView) {
    const ok = await suppressGapTopic(t.id);
    if (ok) {
      emitBbEvent("bb_gap_topic_action", {
        workspaceId: workspaceId ?? null,
        organizationId: organization?.id ?? null,
        gapTopicId: t.id,
        gapTopicAction: "suppress",
        entityType: t.entityTypeHint ?? undefined,
      });
      qc.invalidateQueries({ queryKey: ["bb_gap_topics"] });
    }
  }
  function onCreateDraft(t: BbGapTopicView) {
    const link = buildFactDraftLinkFromGap(workspaceId ?? "", t);
    emitBbEvent("bb_gap_topic_action", {
      workspaceId: workspaceId ?? null,
      organizationId: organization?.id ?? null,
      gapTopicId: t.id,
      gapTopicAction: "create_fact_draft",
      entityType: t.entityTypeHint ?? undefined,
    });
    navigate(link);
  }
  function onLinkExisting(t: BbGapTopicView) {
    emitBbEvent("bb_gap_topic_action", {
      workspaceId: workspaceId ?? null,
      organizationId: organization?.id ?? null,
      gapTopicId: t.id,
      gapTopicAction: "link_fact",
      entityType: t.entityTypeHint ?? undefined,
    });
    const params = new URLSearchParams();
    if (t.entityTypeHint) params.set("entity", t.entityTypeHint);
    params.set("linkGap", t.id);
    navigate(`/w/${workspaceId}/brain/search?${params.toString()}`);
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Demand gaps</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Topics derived from unanswered search, ASC, and assist signals. No automatic facts are created — every action is explicit.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runClustering} disabled={running}>
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-cluster now
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="search">Search</SelectItem>
            <SelectItem value="asc">ASC</SelectItem>
            <SelectItem value="assist">Assist</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityHint} onValueChange={setEntityHint}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity hints</SelectItem>
            {entityHints.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={windowDays} onValueChange={(v) => setWindowDays(v as typeof windowDays)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {topicsQuery.isLoading ? (
        <BrainPanel>
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading gap topics…
          </div>
        </BrainPanel>
      ) : (topicsQuery.data ?? []).length === 0 ? (
        <BbStateBlock
          kind="noData"
          title="No open demand gaps"
          description="Knowledge coverage is keeping up with caller demand for this window."
        />
      ) : (
        <BrainPanel className="p-0 overflow-hidden">
          <ul className="divide-y divide-bb-border-subtle">
            {(topicsQuery.data ?? []).map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3 bb-row-hover">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{t.canonicalQuestion}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {t.entityTypeHint ? (
                      <BrainBadge tone="info">hint: {t.entityTypeHint}</BrainBadge>
                    ) : null}
                    {t.verticalRequirementHint ? (
                      <BrainBadge tone="muted">{t.verticalRequirementHint}</BrainBadge>
                    ) : null}
                    <span className="bb-tnum">{t.openEventCount} signal{t.openEventCount === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span className="bb-tnum">last {new Date(t.lastSeenAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-muted-foreground/80">
                      {t.channels.map((c) => {
                        const I = CHANNEL_ICON[c];
                        return (
                          <span key={c} title={CHANNEL_LABEL[c]} className="inline-flex items-center">
                            <I className="h-3 w-3" />
                          </span>
                        );
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="default" onClick={() => onCreateDraft(t)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Create draft
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onLinkExisting(t)}>
                    <Link2 className="mr-1 h-3.5 w-3.5" /> Link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onSuppress(t)}>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Suppress
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDismiss(t)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </BrainPanel>
      )}
    </section>
  );
}
