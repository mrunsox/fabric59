// Phase 8 — Operational digest panel.
//
// Lets ops manage digest subscribers, preview the current digest summary
// (week-over-week deltas), and trigger a "send" run (recorded; email
// delivery is wired later via send-transactional-email).

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Mail, Send, Trash2, Plus, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useDigestSubscriptions,
  useUpsertDigestSubscription,
  useDeleteDigestSubscription,
  useDigestPreview,
  useSendDigest,
  useDigestRuns,
  type DigestCadence,
  type DigestCohort,
  type DigestDelta,
} from "@/hooks/useLegalConnectDigest";
import { DigestSchedulesPanel, EscalationSinksPanel } from "./AutomationPanels";
import { useTenants } from "@/hooks/useTenants";

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return "—"; }
}

function DeltaBadge({ d, invert = false }: { d: DigestDelta; invert?: boolean }) {
  const up = d.delta > 0;
  const down = d.delta < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const cls = good
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
    : bad
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-muted text-muted-foreground border-border";
  const Arrow = up ? ArrowUp : down ? ArrowDown : null;
  return (
    <Badge variant="outline" className={`tabular-nums ${cls}`}>
      {Arrow && <Arrow className="h-3 w-3 mr-1" />}
      {d.delta >= 0 ? "+" : ""}
      {d.delta} ({d.pct >= 0 ? "+" : ""}
      {d.pct}%)
    </Badge>
  );
}

interface Props {
  orgId: string | null | undefined;
}

export default function DigestPanel({ orgId }: Props) {
  const [previewWindow, setPreviewWindow] = useState<"24h" | "7d" | "30d">("7d");
  const [cohort, setCohort] = useState<DigestCohort>("ops");
  const [cadence, setCadence] = useState<DigestCadence>("weekly");
  const [tenantScope, setTenantScope] = useState<string>("__all__");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const subsQ = useDigestSubscriptions(orgId);
  const runsQ = useDigestRuns(orgId);
  const previewQ = useDigestPreview(orgId, previewWindow);
  const upsert = useUpsertDigestSubscription(orgId);
  const remove = useDeleteDigestSubscription(orgId);
  const send = useSendDigest(orgId);
  const tenantsQ = useTenants();

  const subs = subsQ.data ?? [];
  const runs = runsQ.data ?? [];
  const summary = previewQ.data;
  // Only tenants that belong to this org — never expose cross-tenant data.
  const tenantsForOrg = useMemo(
    () => (tenantsQ.data ?? []).filter((t) => t.organization_id === orgId),
    [tenantsQ.data, orgId],
  );
  const tenantNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tenantsForOrg) m.set(t.id, t.name);
    return m;
  }, [tenantsForOrg]);

  const cohortCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subs) {
      if (!s.enabled) continue;
      if (s.cadence !== cadence) continue;
      if (cohort !== "all" && s.cohort !== cohort && s.cohort !== "all") continue;
      map.set(s.recipient_email, 1);
    }
    return map.size;
  }, [subs, cadence, cohort]);

  const handleAdd = () => {
    if (!email.trim()) return;
    const tenant_id = tenantScope === "__all__" ? null : tenantScope;
    upsert.mutate(
      { recipient_email: email, recipient_name: name || undefined, cohort, cadence, enabled: true, tenant_id },
      { onSuccess: () => { setEmail(""); setName(""); } },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Operational digests
          </CardTitle>
          <CardDescription className="text-xs">
            Scheduled summaries for internal operators. Week-over-week deltas, top failing tenants, alerts, and GA progress.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="preview">Preview &amp; deltas</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers ({subs.length})</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="escalation">Escalation</TabsTrigger>
            <TabsTrigger value="history">History ({runs.length})</TabsTrigger>
          </TabsList>

          {/* Preview */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">Window</Label>
                <Select value={previewWindow} onValueChange={(v) => setPreviewWindow(v as any)}>
                  <SelectTrigger className="w-[150px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cohort</Label>
                <Select value={cohort} onValueChange={(v) => setCohort(v as DigestCohort)}>
                  <SelectTrigger className="w-[180px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ops">Ops / superadmin</SelectItem>
                    <SelectItem value="design_partners">Design partners</SelectItem>
                    <SelectItem value="all">All subscribers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cadence</Label>
                <Select value={cadence} onValueChange={(v) => setCadence(v as DigestCadence)}>
                  <SelectTrigger className="w-[140px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                {cohortCount} active recipient(s) match this cohort + cadence
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => previewQ.refetch()}
                  disabled={previewQ.isFetching}
                >
                  Refresh preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => send.mutate({ cadence, cohort })}
                  disabled={send.isPending}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send digest
                </Button>
              </div>
            </div>

            {previewQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            ) : !summary ? (
              <p className="text-sm text-muted-foreground">No preview available.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Total jobs</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.totals.jobs}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.total_jobs} /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Success rate</div>
                    <div className="text-xl font-semibold tabular-nums">
                      {summary.deltas.success_rate.current === null ? "—" : `${summary.deltas.success_rate.current}%`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      prev: {summary.deltas.success_rate.previous === null ? "—" : `${summary.deltas.success_rate.previous}%`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Failed jobs</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.totals.failed}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.failed_jobs} invert /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Open alerts</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.totals.open_alerts}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.open_alerts} invert /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Rate-limited</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.deltas.rate_limited.current}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.rate_limited} invert /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Recurring issues</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.totals.recurring}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.recurring_issues} invert /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">GA items done</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.deltas.ga_done.current}</div>
                    <div className="mt-1"><DeltaBadge d={summary.deltas.ga_done} /></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Tenants</div>
                    <div className="text-xl font-semibold tabular-nums">{summary.totals.tenants}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {summary.totals.design_partners} design partner(s)
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium mb-2">Top failing tenants</div>
                    {summary.top_failing_tenants.length === 0 ? (
                      <p className="text-xs text-muted-foreground">None — no tenant failures in window.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {summary.top_failing_tenants.map((t, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span>{t.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {t.failed} / {t.total}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium mb-2">Top failing actions</div>
                    {summary.top_failing_actions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">None — no provider failures in window.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {summary.top_failing_actions.map((a, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span className="capitalize">{a.provider} · {a.action}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {a.failed} / {a.total}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {summary.release_notes.length > 0 && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium mb-2">Release notes shipped this window</div>
                    <ul className="space-y-1 text-sm">
                      {summary.release_notes.map((r) => (
                        <li key={r.id} className="flex items-center justify-between">
                          <span>{r.title}</span>
                          <span className="text-xs text-muted-foreground capitalize">{r.audience}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Subscribers */}
          <TabsContent value="subscribers" className="space-y-4">
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ops@yourco.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Name (optional)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Cohort</Label>
                  <Select value={cohort} onValueChange={(v) => setCohort(v as DigestCohort)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ops">Ops / superadmin</SelectItem>
                      <SelectItem value="design_partners">Design partners</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cadence</Label>
                  <Select value={cadence} onValueChange={(v) => setCadence(v as DigestCadence)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-4">
                  <Label className="text-xs">Tenant scope</Label>
                  <Select value={tenantScope} onValueChange={setTenantScope}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Org-wide (all tenants in cohort)</SelectItem>
                      {tenantsForOrg.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tenant-scoped recipients only see data for that tenant. Cross-tenant data is never included.
                  </p>
                </div>
                <Button size="sm" onClick={handleAdd} disabled={upsert.isPending || !email.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add subscriber
                </Button>
              </div>
            </div>

            {subs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscribers yet.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Cohort</TableHead>
                      <TableHead>Cadence</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Last sent</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">
                          {s.recipient_email}
                          {s.recipient_name && (
                            <div className="text-[11px] text-muted-foreground">{s.recipient_name}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{s.cohort.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs capitalize">{s.cadence}</TableCell>
                        <TableCell>
                          <Switch
                            checked={s.enabled}
                            onCheckedChange={(v) =>
                              upsert.mutate({
                                recipient_email: s.recipient_email,
                                recipient_name: s.recipient_name ?? undefined,
                                cohort: s.cohort,
                                cadence: s.cadence,
                                enabled: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtAgo(s.last_sent_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove.mutate(s.id)}
                            disabled={remove.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedules">
            <DigestSchedulesPanel orgId={orgId} />
          </TabsContent>

          <TabsContent value="escalation">
            <EscalationSinksPanel orgId={orgId} />
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No digest runs recorded yet.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Cadence</TableHead>
                      <TableHead>Cohort</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Window</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          <History className="h-3 w-3 inline mr-1" />
                          {fmtAgo(r.created_at)}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{r.cadence}</TableCell>
                        <TableCell className="text-xs capitalize">{r.cohort.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.recipients_count}</TableCell>
                        <TableCell className="text-xs capitalize">{r.delivery_status}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {new Date(r.window_start).toLocaleDateString()} →{" "}
                          {new Date(r.window_end).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
