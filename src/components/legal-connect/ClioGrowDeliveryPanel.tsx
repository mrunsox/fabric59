import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Phase 1.1 minimal delivery inspector for Clio Grow.
 *
 * Joins three signals admins need to debug an MVP rollout without digging
 * through raw SQL:
 *   - legal_connect_sync_jobs   (queued / processing / succeeded / failed)
 *   - five9_event_log           (correlation, producer skip reasons)
 *   - legal_connect_review_queue (validation / no_connection items)
 *
 * Intentionally NOT the full Phase 2 delivery dashboard — this is a 90-day
 * operational panel scoped to Clio Grow only.
 */

interface SyncJob {
  id: string;
  status: string;
  job_type: string;
  correlation_id: string | null;
  created_at: string;
  attempt_count: number | null;
  failure_reason: string | null;
  client_id: string | null;
  connection_id: string | null;
}

interface EventLogRow {
  correlation_id: string | null;
  event_type: string | null;
  resolved_client_id: string | null;
  resolved_provider: string | null;
  campaign_name: string | null;
  ani: string | null;
  status: string | null;
  mapped_actions: any;
  sync_jobs_created: any;
}

interface ReviewItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  review_type: string;
  created_at: string;
  client_id: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  queued: { label: "Queued", cls: "text-muted-foreground border-border", icon: Clock },
  processing: { label: "Processing", cls: "border-primary/40 text-primary", icon: Loader2 },
  succeeded: { label: "Succeeded", cls: "border-success/40 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "border-destructive/40 text-destructive", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    cls: "text-muted-foreground border-border",
    icon: Activity,
  };
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", meta.cls)}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {meta.label}
    </Badge>
  );
}

function fmt(iso: string) {
  const t = Date.now() - new Date(iso).getTime();
  if (t < 60_000) return "just now";
  if (t < 3_600_000) return `${Math.floor(t / 60_000)}m ago`;
  if (t < 86_400_000) return `${Math.floor(t / 3_600_000)}h ago`;
  return `${Math.floor(t / 86_400_000)}d ago`;
}

export default function ClioGrowDeliveryPanel({ clientId }: { clientId?: string }) {
  const { organization } = useAuth();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [events, setEvents] = useState<EventLogRow[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      let jq = supabase
        .from("legal_connect_sync_jobs")
        .select(
          "id, status, job_type, correlation_id, created_at, attempt_count, failure_reason, client_id, connection_id",
        )
        .eq("organization_id", organization.id)
        .eq("provider", "clio_grow")
        .order("created_at", { ascending: false })
        .limit(25);
      if (clientId) jq = jq.eq("client_id", clientId);

      let eq = supabase
        .from("five9_event_log")
        .select(
          "correlation_id, event_type, resolved_client_id, resolved_provider, campaign_name, ani, status, mapped_actions, sync_jobs_created",
        )
        .eq("organization_id", organization.id)
        .eq("resolved_provider", "clio_grow")
        .order("created_at", { ascending: false })
        .limit(25);
      if (clientId) eq = eq.eq("resolved_client_id", clientId);

      let rq = supabase
        .from("legal_connect_review_queue")
        .select("id, title, description, status, review_type, created_at, client_id")
        .eq("organization_id", organization.id)
        .eq("provider", "clio_grow")
        .order("created_at", { ascending: false })
        .limit(15);
      if (clientId) rq = rq.eq("client_id", clientId);

      const [jr, er, rr] = await Promise.all([jq, eq, rq]);
      setJobs(((jr.data ?? []) as unknown) as SyncJob[]);
      setEvents(((er.data ?? []) as unknown) as EventLogRow[]);
      setReview(((rr.data ?? []) as unknown) as ReviewItem[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, clientId]);

  const eventsByCorr = useMemo(() => {
    const m = new Map<string, EventLogRow>();
    for (const e of events) if (e.correlation_id) m.set(e.correlation_id, e);
    return m;
  }, [events]);

  const counts = useMemo(() => {
    const c = { queued: 0, processing: 0, succeeded: 0, failed: 0 };
    for (const j of jobs) if (j.status in c) (c as any)[j.status]++;
    return c;
  }, [jobs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Clio Grow delivery
            </CardTitle>
            <CardDescription className="text-xs">
              Last 25 lead-create jobs and the Five9 events that produced them. Use this to debug
              MVP rollouts before the full delivery dashboard ships.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {(["queued", "processing", "succeeded", "failed"] as const).map((k) => (
            <div
              key={k}
              className="rounded-md border border-border/60 bg-muted/20 p-2 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="text-lg font-semibold text-foreground">{counts[k]}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold text-foreground mb-2">Recent jobs</div>
          {jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No Clio Grow jobs yet. Trigger a Five9 event whose disposition mapping requests
              <code className="mx-1 px-1 rounded bg-muted">create_lead</code>.
            </p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map((j) => {
                const ev = j.correlation_id ? eventsByCorr.get(j.correlation_id) : null;
                return (
                  <div
                    key={j.id}
                    className="rounded-md border border-border/60 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={j.status} />
                        <span className="font-mono text-[11px] truncate text-muted-foreground">
                          {j.job_type} · {j.correlation_id?.slice(0, 12) ?? "—"}
                        </span>
                      </div>
                      <span className="text-muted-foreground">{fmt(j.created_at)}</span>
                    </div>
                    {ev && (
                      <div className="text-[11px] text-muted-foreground">
                        from {ev.event_type ?? "event"}
                        {ev.campaign_name ? ` · ${ev.campaign_name}` : ""}
                        {ev.ani ? ` · ${ev.ani}` : ""}
                      </div>
                    )}
                    {j.last_error && (
                      <div className="text-[11px] text-destructive break-words">
                        {j.last_error}
                        {(j.attempt_count ?? 0) > 0 && (
                          <span className="text-muted-foreground"> · attempt {j.attempt_count}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            Review queue (Clio Grow)
          </div>
          {review.length === 0 ? (
            <p className="text-xs text-muted-foreground">No outstanding items.</p>
          ) : (
            <div className="space-y-1.5">
              {review.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-warning/30 bg-warning/5 p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground break-words">{r.reason}</span>
                    <span className="text-muted-foreground shrink-0">{fmt(r.created_at)}</span>
                  </div>
                  {r.correlation_id && (
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {r.correlation_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-foreground mb-2">Producer skip reasons</div>
          <div className="flex flex-wrap gap-1.5">
            {events
              .map((e) => (e.mapped_actions as any)?.producer_skip_reason)
              .filter((r): r is string => !!r)
              .reduce<{ reason: string; n: number }[]>((acc, r) => {
                const existing = acc.find((x) => x.reason === r);
                if (existing) existing.n++;
                else acc.push({ reason: r, n: 1 });
                return acc;
              }, [])
              .map((row) => (
                <Badge key={row.reason} variant="outline" className="text-[10px]">
                  {row.reason} · {row.n}
                </Badge>
              ))}
            {events.every((e) => !(e.mapped_actions as any)?.producer_skip_reason) && (
              <span className="text-[11px] text-muted-foreground">
                No skipped events in the last 25 — every routed event produced a job.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
