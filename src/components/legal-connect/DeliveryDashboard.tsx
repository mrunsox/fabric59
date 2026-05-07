import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  Search,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Phase 2 — operational delivery dashboard.
 *
 * Joins legal_connect_sync_jobs, five9_event_log, and review_queue into a
 * single filterable table. Drill-down sheet shows the normalized event,
 * mapping result, sync job history, and a redacted payload preview.
 *
 * Replaces the MVP `ClioGrowDeliveryPanel` for ongoing ops. The MVP panel
 * is kept on the overview page as a quick at-a-glance tile.
 */

interface JobRow {
  id: string;
  status: string;
  job_type: string;
  provider: string;
  correlation_id: string | null;
  client_id: string | null;
  connection_id: string | null;
  attempt_count: number | null;
  failure_reason: string | null;
  failure_classification: string | null;
  input_payload: any;
  output_payload: any;
  created_at: string;
  last_attempt_at: string | null;
  succeeded_at: string | null;
  failed_at: string | null;
}

interface EventRow {
  id: string;
  correlation_id: string | null;
  event_type: string | null;
  ani: string | null;
  campaign_name: string | null;
  resolved_provider: string | null;
  resolved_client_id: string | null;
  status: string | null;
  mapped_actions: any;
  worksheet_payload: any;
  normalized_payload: any;
  created_at: string;
}

interface ReviewRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  review_type: string;
  recommended_action: string | null;
  client_id: string | null;
  provider: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  queued: { label: "Queued", cls: "text-muted-foreground border-border", icon: Clock },
  processing: { label: "Processing", cls: "border-primary/40 text-primary", icon: Loader2 },
  succeeded: { label: "Succeeded", cls: "border-success/40 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "border-destructive/40 text-destructive", icon: XCircle },
  skipped: { label: "Skipped", cls: "border-warning/40 text-warning", icon: AlertTriangle },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? {
    label: status,
    cls: "border-border text-muted-foreground",
    icon: Activity,
  };
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", m.cls)}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {m.label}
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

function safeRedact(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      if (/token|secret|password|api_key/i.test(k)) o[k] = "***redacted***";
      else if (typeof o[k] === "object") walk(o[k]);
    }
  };
  walk(clone);
  return clone;
}

export default function DeliveryDashboard() {
  const { organization } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<JobRow | null>(null);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [j, e, r] = await Promise.all([
        supabase
          .from("legal_connect_sync_jobs")
          .select(
            "id, status, job_type, provider, correlation_id, client_id, connection_id, attempt_count, failure_reason, failure_classification, input_payload, output_payload, created_at, last_attempt_at, succeeded_at, failed_at",
          )
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("five9_event_log")
          .select(
            "id, correlation_id, event_type, ani, campaign_name, resolved_provider, resolved_client_id, status, mapped_actions, worksheet_payload, normalized_payload, created_at",
          )
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("legal_connect_review_queue")
          .select(
            "id, title, description, status, review_type, recommended_action, client_id, provider, created_at",
          )
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      setJobs(((j.data ?? []) as unknown) as JobRow[]);
      setEvents(((e.data ?? []) as unknown) as EventRow[]);
      setReview(((r.data ?? []) as unknown) as ReviewRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const eventsByCorr = useMemo(() => {
    const m = new Map<string, EventRow>();
    for (const e of events) if (e.correlation_id) m.set(e.correlation_id, e);
    return m;
  }, [events]);
  const reviewByCorr = useMemo(() => {
    const m = new Map<string, ReviewRow[]>();
    for (const r of review) {
      const ap = (r as any).action_payload?.correlation_id;
      const k = ap ?? r.id;
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
    return m;
  }, [review]);

  const skipReasons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const r = (e.mapped_actions as any)?.producer_skip_reason;
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const providers = useMemo(() => {
    const s = new Set<string>();
    jobs.forEach((j) => j.provider && s.add(j.provider));
    return Array.from(s);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (providerFilter !== "all" && j.provider !== providerFilter) return false;
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(j.correlation_id ?? "").toLowerCase().includes(q) &&
          !(j.failure_reason ?? "").toLowerCase().includes(q) &&
          !(j.job_type ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [jobs, providerFilter, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { queued: 0, processing: 0, succeeded: 0, failed: 0, skipped: 0 };
    for (const j of filteredJobs) if (j.status in c) (c as any)[j.status]++;
    // skipped events are tracked on event log, not jobs.
    c.skipped = events.filter((e) => (e.mapped_actions as any)?.producer_skip_reason).length;
    return c;
  }, [filteredJobs, events]);

  const openEvent = open?.correlation_id ? eventsByCorr.get(open.correlation_id) : null;
  const openReview = open?.correlation_id ? reviewByCorr.get(open.correlation_id) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Delivery dashboard
              </CardTitle>
              <CardDescription className="text-xs">
                Last 100 sync jobs across Legal Connect providers, joined to events and review
                queue. Click any row to inspect.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {(["queued", "processing", "succeeded", "failed", "skipped"] as const).map((k) => (
              <div
                key={k}
                className="rounded-md border border-border/60 bg-muted/20 p-2 text-center"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {k}
                </div>
                <div className="text-lg font-semibold text-foreground">{counts[k]}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search correlation id, error, job type…"
                className="pl-7 h-8 text-xs"
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(STATUS_META).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground text-[11px]">
                <tr>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Provider</th>
                  <th className="text-left p-2 font-medium">Job</th>
                  <th className="text-left p-2 font-medium">Correlation</th>
                  <th className="text-left p-2 font-medium">Disposition</th>
                  <th className="text-left p-2 font-medium">Attempts</th>
                  <th className="text-left p-2 font-medium">When</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No jobs match the current filters.
                    </td>
                  </tr>
                )}
                {filteredJobs.map((j) => {
                  const ev = j.correlation_id ? eventsByCorr.get(j.correlation_id) : null;
                  const dispo =
                    (ev?.normalized_payload as any)?.disposition ??
                    (ev?.mapped_actions as any)?.actions?.[0]?.payload?.disposition ??
                    "—";
                  return (
                    <tr
                      key={j.id}
                      onClick={() => setOpen(j)}
                      className="border-t border-border/40 hover:bg-muted/30 cursor-pointer"
                    >
                      <td className="p-2"><StatusBadge status={j.status} /></td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {j.provider}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-[11px]">{j.job_type}</td>
                      <td className="p-2 font-mono text-[10px] text-muted-foreground">
                        {j.correlation_id?.slice(0, 16) ?? "—"}
                      </td>
                      <td className="p-2 text-muted-foreground">{String(dispo).slice(0, 28)}</td>
                      <td className="p-2 text-muted-foreground">{j.attempt_count ?? 0}</td>
                      <td className="p-2 text-muted-foreground">{fmt(j.created_at)}</td>
                      <td className="p-2">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {skipReasons.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-foreground mb-1.5">
                Skip reasons (events not turned into jobs)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skipReasons.map(([r, n]) => (
                  <Badge key={r} variant="outline" className="text-[10px]">
                    {r} · {n}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {open && <StatusBadge status={open.status} />}
              {open?.job_type}
            </SheetTitle>
            <SheetDescription className="font-mono text-[11px]">
              {open?.correlation_id ?? open?.id}
            </SheetDescription>
          </SheetHeader>

          {open && (
            <div className="space-y-5 mt-4 text-xs">
              <section>
                <h4 className="font-semibold text-foreground mb-1.5">Job</h4>
                <dl className="grid grid-cols-2 gap-1 text-[11px]">
                  <dt className="text-muted-foreground">Provider</dt><dd>{open.provider}</dd>
                  <dt className="text-muted-foreground">Status</dt><dd>{open.status}</dd>
                  <dt className="text-muted-foreground">Attempts</dt><dd>{open.attempt_count ?? 0}</dd>
                  <dt className="text-muted-foreground">Last attempt</dt>
                  <dd>{open.last_attempt_at ? fmt(open.last_attempt_at) : "—"}</dd>
                  <dt className="text-muted-foreground">Failure class</dt>
                  <dd>{open.failure_classification ?? "—"}</dd>
                </dl>
                {open.failure_reason && (
                  <p className="mt-2 text-destructive break-words text-[11px]">
                    {open.failure_reason}
                  </p>
                )}
              </section>

              {openEvent && (
                <section>
                  <h4 className="font-semibold text-foreground mb-1.5">Normalized event</h4>
                  <dl className="grid grid-cols-2 gap-1 text-[11px]">
                    <dt className="text-muted-foreground">Type</dt><dd>{openEvent.event_type}</dd>
                    <dt className="text-muted-foreground">Campaign</dt>
                    <dd>{openEvent.campaign_name ?? "—"}</dd>
                    <dt className="text-muted-foreground">ANI</dt><dd>{openEvent.ani ?? "—"}</dd>
                    <dt className="text-muted-foreground">Resolved provider</dt>
                    <dd>{openEvent.resolved_provider ?? "—"}</dd>
                  </dl>
                  {(openEvent.mapped_actions as any)?.producer_skip_reason && (
                    <p className="mt-2 text-warning text-[11px]">
                      Producer skipped: {(openEvent.mapped_actions as any).producer_skip_reason}
                    </p>
                  )}
                </section>
              )}

              {openEvent?.worksheet_payload && Object.keys(openEvent.worksheet_payload).length > 0 && (
                <section>
                  <h4 className="font-semibold text-foreground mb-1.5">Worksheet snapshot</h4>
                  <pre className="text-[11px] font-mono p-2 rounded bg-muted/40 border border-border/60 overflow-auto max-h-40">
                    {JSON.stringify(openEvent.worksheet_payload, null, 2)}
                  </pre>
                </section>
              )}

              {openReview && openReview.length > 0 && (
                <section>
                  <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    Review queue
                  </h4>
                  <div className="space-y-1.5">
                    {openReview.map((r) => (
                      <div
                        key={r.id}
                        className="rounded border border-warning/30 bg-warning/5 p-2 text-[11px]"
                      >
                        <div className="font-medium text-foreground">{r.title}</div>
                        {r.description && (
                          <div className="text-muted-foreground">{r.description}</div>
                        )}
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {r.review_type} · {r.recommended_action ?? r.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="font-semibold text-foreground mb-1.5">
                  Outbound payload (redacted)
                </h4>
                <pre className="text-[11px] font-mono p-2 rounded bg-muted/40 border border-border/60 overflow-auto max-h-72">
                  {JSON.stringify(safeRedact(open.input_payload), null, 2)}
                </pre>
              </section>

              {open.output_payload && (
                <section>
                  <h4 className="font-semibold text-foreground mb-1.5">Provider response</h4>
                  <pre className="text-[11px] font-mono p-2 rounded bg-muted/40 border border-border/60 overflow-auto max-h-40">
                    {JSON.stringify(safeRedact(open.output_payload), null, 2)}
                  </pre>
                </section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
