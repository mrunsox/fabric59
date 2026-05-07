import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle,
  Activity,
  ListChecks,
  TrendingDown,
  Building2,
  Mail,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLegalConnectReports,
  type ReportWindow,
  type TenantSummary,
} from "@/hooks/useLegalConnectReports";
import { useDigestPreview } from "@/hooks/useLegalConnectDigest";
import { useIssueReviews, useUpsertIssueReview, type IssueReviewStatus } from "@/hooks/useIssueReviews";
import DigestPanel from "@/components/legal-connect/DigestPanel";
import { remediationForRecurring, remediationForAlertKind } from "@/lib/legal-connect-remediation";
import { downloadCsv, downloadJson } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const WINDOW_LABELS: Record<ReportWindow, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const SEVERITY_CLASS: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  warning: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

function fmtAgo(iso: string | null) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function LegalConnectReportsPage() {
  const { organization } = useAuth();
  const [window, setWindow] = useState<ReportWindow>("7d");
  const [provider, setProvider] = useState<string>("all");
  const [rollout, setRollout] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useLegalConnectReports(organization?.id, window);
  const digestPreviewQ = useDigestPreview(organization?.id, window);
  const reviewsQ = useIssueReviews(organization?.id);
  const upsertReview = useUpsertIssueReview(organization?.id);
  const reviews = reviewsQ.data ?? {};
  const deltas = digestPreviewQ.data?.deltas;

  const filteredTenants: TenantSummary[] = (data?.tenants ?? []).filter((t) => {
    if (rollout !== "all" && t.rollout_status !== rollout) return false;
    if (search && !t.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredScorecards = (data?.scorecards ?? []).filter(
    (s) => provider === "all" || s.provider === provider,
  );

  const filteredAlerts = (data?.alerts ?? []).filter((a) => {
    if (search && !a.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const providerOptions = Array.from(new Set((data?.scorecards ?? []).map((s) => s.provider)));
  const rolloutOptions = Array.from(new Set((data?.tenants ?? []).map((t) => t.rollout_status)));

  const exportTenantsCsv = () => {
    downloadCsv(`lc-tenants-${window}.csv`, filteredTenants, [
      "client_name",
      "rollout_status",
      "pilot_status",
      "readiness_state",
      "is_design_partner",
      "total_jobs",
      "succeeded",
      "failed",
      "retried",
      "rate_limited",
      "test_jobs",
      "live_jobs",
      "success_rate",
      "top_error_class",
      "open_alerts",
      "ga_done",
      "ga_total",
      "last_activity",
    ]);
  };

  const exportAlertsCsv = () => {
    downloadCsv(`lc-alerts-${window}.csv`, filteredAlerts, [
      "client_name",
      "alert_kind",
      "severity",
      "status",
      "title",
      "created_at",
    ]);
  };

  const exportScorecardsCsv = () => {
    downloadCsv(`lc-scorecards-${window}.csv`, filteredScorecards, [
      "provider",
      "action",
      "attempts",
      "succeeded",
      "failed",
      "rate_limited",
      "success_rate",
      "top_error_class",
      "last_activity",
    ]);
  };

  const exportErrorsCsv = () => {
    downloadCsv(`lc-errors-${window}.csv`, data?.error_classes ?? [], [
      "error_class",
      "count",
      "affected_tenants",
      "latest",
    ]);
  };

  const exportRolloutCsv = () => {
    downloadCsv(
      `lc-rollout-${window}.csv`,
      filteredTenants,
      ["client_name", "rollout_status", "pilot_status", "readiness_state", "ga_done", "ga_total"],
    );
  };

  const exportFullJson = () => {
    if (!data) return;
    downloadJson(`lc-report-${window}.json`, data);
  };

  return (
    <>
      <SEOHead
        title="Legal Connect Reports | Superadmin"
        description="Operational reporting and audit exports for Legal Connect"
      />
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">Legal Connect Reports</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Internal reporting layer for operators. Tenant health, provider scorecards, recurring issues,
              rollout/pilot distribution, and CSV / JSON exports for audit follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={window} onValueChange={(v) => setWindow(v as ReportWindow)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["24h", "7d", "30d"] as ReportWindow[]).map((w) => (
                  <SelectItem key={w} value={w}>{WINDOW_LABELS[w]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportFullJson} disabled={!data}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Full JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search tenant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px]"
            />
            <Select value={rollout} onValueChange={setRollout}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Rollout status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rollout statuses</SelectItem>
                {rolloutOptions.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {providerOptions.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Window: {WINDOW_LABELS[window]} · Generated {data ? fmtAgo(data.generated_at) : "—"}
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Tenants" value={data?.totals.tenants ?? 0} />
          <SummaryCard
            label="Jobs"
            value={data?.totals.jobs ?? 0}
            hint={deltas ? `${deltas.total_jobs.delta >= 0 ? "+" : ""}${deltas.total_jobs.delta} vs prev (${deltas.total_jobs.pct >= 0 ? "+" : ""}${deltas.total_jobs.pct}%)` : WINDOW_LABELS[window]}
          />
          <SummaryCard label="Succeeded" value={data?.totals.succeeded ?? 0} />
          <SummaryCard
            label="Failed"
            value={data?.totals.failed ?? 0}
            hint={deltas ? `${deltas.failed_jobs.delta >= 0 ? "+" : ""}${deltas.failed_jobs.delta} vs prev` : undefined}
          />
          <SummaryCard
            label="Open / ack alerts"
            value={data?.totals.open_alerts ?? 0}
            hint={deltas ? `${deltas.open_alerts.delta >= 0 ? "+" : ""}${deltas.open_alerts.delta} vs prev` : undefined}
          />
        </div>

        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants"><Building2 className="h-3.5 w-3.5 mr-1.5" />Tenants</TabsTrigger>
            <TabsTrigger value="scorecards"><Activity className="h-3.5 w-3.5 mr-1.5" />Scorecards</TabsTrigger>
            <TabsTrigger value="errors"><TrendingDown className="h-3.5 w-3.5 mr-1.5" />Errors</TabsTrigger>
            <TabsTrigger value="alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Alerts</TabsTrigger>
            <TabsTrigger value="recurring"><ListChecks className="h-3.5 w-3.5 mr-1.5" />Recurring</TabsTrigger>
            <TabsTrigger value="rollout">Rollout / GA</TabsTrigger>
            <TabsTrigger value="digests"><Mail className="h-3.5 w-3.5 mr-1.5" />Digests</TabsTrigger>
          </TabsList>

          {/* Tenants */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tenant activity ({filteredTenants.length})</CardTitle>
                  <CardDescription className="text-xs">
                    Per-tenant rollup of jobs, success rate, alerts, and GA progress over the selected window.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportTenantsCsv} disabled={!filteredTenants.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : filteredTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tenants in window.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Rollout</TableHead>
                          <TableHead className="text-right">Jobs</TableHead>
                          <TableHead className="text-right">Success</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Rate-lim</TableHead>
                          <TableHead className="text-right">Test/Live</TableHead>
                          <TableHead>Top error</TableHead>
                          <TableHead className="text-right">Alerts</TableHead>
                          <TableHead className="text-right">GA</TableHead>
                          <TableHead>Last activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTenants.map((t) => (
                          <TableRow key={t.client_id}>
                            <TableCell>
                              <div className="font-medium text-sm">{t.client_name}</div>
                              <div className="text-[11px] text-muted-foreground capitalize">
                                {t.pilot_status.replace(/_/g, " ")} · {t.readiness_state.replace(/_/g, " ")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {t.rollout_status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.total_jobs}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {t.success_rate === null ? "—" : `${t.success_rate}%`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.failed}</TableCell>
                            <TableCell className="text-right tabular-nums">{t.rate_limited}</TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {t.test_jobs} / {t.live_jobs}
                            </TableCell>
                            <TableCell className="text-xs">{t.top_error_class ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{t.open_alerts}</TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {t.ga_total > 0 ? `${t.ga_done}/${t.ga_total}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {fmtAgo(t.last_activity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scorecards */}
          <TabsContent value="scorecards">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Provider / action scorecards</CardTitle>
                  <CardDescription className="text-xs">
                    Attempts, success rate, and top error per provider+action across the org.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportScorecardsCsv} disabled={!filteredScorecards.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {filteredScorecards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No provider activity in window.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Attempts</TableHead>
                          <TableHead className="text-right">Success</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Rate-lim</TableHead>
                          <TableHead>Top error</TableHead>
                          <TableHead>Last activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredScorecards.map((s) => (
                          <TableRow key={s.key}>
                            <TableCell className="capitalize text-sm">{s.provider}</TableCell>
                            <TableCell className="text-xs">{s.action}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.attempts}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {s.success_rate === null ? "—" : `${s.success_rate}%`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{s.failed}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.rate_limited}</TableCell>
                            <TableCell className="text-xs">{s.top_error_class ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {fmtAgo(s.last_activity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors */}
          <TabsContent value="errors">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Error classes</CardTitle>
                  <CardDescription className="text-xs">
                    Failure counts by classification (auth, rate_limited, upstream, validation, …).
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportErrorsCsv} disabled={!data?.error_classes?.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {(data?.error_classes ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failures in window. </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Tenants affected</TableHead>
                          <TableHead>Latest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.error_classes ?? []).map((e) => (
                          <TableRow key={e.error_class}>
                            <TableCell className="text-sm">{e.error_class}</TableCell>
                            <TableCell className="text-right tabular-nums">{e.count}</TableCell>
                            <TableCell className="text-right tabular-nums">{e.affected_tenants}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtAgo(e.latest)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Alert history ({filteredAlerts.length})</CardTitle>
                  <CardDescription className="text-xs">
                    All alerts (open, acknowledged, resolved) raised inside the selected window.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportAlertsCsv} disabled={!filteredAlerts.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No alerts in window.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead>Next step</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAlerts.map((a) => {
                          const rem = remediationForAlertKind(a.alert_kind, a.client_id);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="text-sm">{a.client_name}</TableCell>
                              <TableCell className="text-xs">{a.alert_kind}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("capitalize", SEVERITY_CLASS[a.severity])}>
                                  {a.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs capitalize">{a.status}</TableCell>
                              <TableCell className="text-xs">{a.title}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtAgo(a.created_at)}</TableCell>
                              <TableCell>
                                <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                  <Link to={rem.href} title={rem.hint}>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    <span className="text-xs">{rem.label}</span>
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recurring */}
          <TabsContent value="recurring">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recurring issues</CardTitle>
                <CardDescription className="text-xs">
                  Patterns worth attention: 3+ failures of the same class on a tenant, or repeating alert kinds.
                  Acknowledge or move into monitoring as you triage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.recurring ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recurring patterns detected.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead>Latest</TableHead>
                          <TableHead>Review</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Next step</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.recurring ?? []).map((r) => {
                          const rev = reviews[r.key];
                          const rem = remediationForRecurring(r.key, r.issue_type);
                          return (
                            <TableRow key={r.key}>
                              <TableCell className="text-sm">{r.issue_type}</TableCell>
                              <TableCell className="text-sm">{r.scope}</TableCell>
                              <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtAgo(r.latest)}</TableCell>
                              <TableCell>
                                <Select
                                  value={(rev?.status ?? "new") as IssueReviewStatus}
                                  onValueChange={(v) =>
                                    upsertReview.mutate({
                                      issue_key: r.key,
                                      status: v as IssueReviewStatus,
                                      note: rev?.note ?? null,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                    <SelectItem value="monitoring">Monitoring</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="min-w-[180px]">
                                <Textarea
                                  defaultValue={rev?.note ?? ""}
                                  placeholder="Internal note…"
                                  className="text-xs min-h-[32px] py-1"
                                  rows={1}
                                  onBlur={(e) => {
                                    const next = e.currentTarget.value.trim();
                                    if ((rev?.note ?? "") === next) return;
                                    upsertReview.mutate({
                                      issue_key: r.key,
                                      status: rev?.status ?? "acknowledged",
                                      note: next || null,
                                    });
                                  }}
                                />
                                {rev?.updated_from && rev.updated_from !== "app" && (
                                  <div className="text-[10px] text-muted-foreground mt-1 capitalize">
                                    via {rev.updated_from}{rev.external_actor ? ` · ${rev.external_actor}` : ""}
                                  </div>
                                )}
                              <TableCell>
                                <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                  <Link to={rem.href} title={rem.hint}>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    <span className="text-xs">{rem.label}</span>
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rollout / GA */}
          <TabsContent value="rollout">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Rollout distribution</CardTitle>
                  <CardDescription className="text-xs">Tenants by current rollout stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {(data?.rollout_buckets ?? []).map((b) => (
                    <div key={b.status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{b.status.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="tabular-nums">{b.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pilot status</CardTitle>
                  <CardDescription className="text-xs">Tenants by pilot approval stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {(data?.pilot_buckets ?? []).map((b) => (
                    <div key={b.status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{b.status.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="tabular-nums">{b.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">GA checklist progress</CardTitle>
                  <CardDescription className="text-xs">Per-tenant completion of the shared GA checklist.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportRolloutCsv} disabled={!filteredTenants.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Rollout</TableHead>
                        <TableHead>Pilot</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead className="text-right">GA done</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.map((t) => (
                        <TableRow key={t.client_id}>
                          <TableCell className="text-sm">{t.client_name}</TableCell>
                          <TableCell className="text-xs capitalize">{t.rollout_status.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-xs capitalize">{t.pilot_status.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-xs capitalize">{t.readiness_state.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {t.ga_total > 0 ? `${t.ga_done}/${t.ga_total}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="digests">
            <DigestPanel orgId={organization?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
