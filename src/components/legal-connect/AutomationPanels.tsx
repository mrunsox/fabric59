// Phase 9 — Schedules and escalation sinks panel content,
// rendered inside DigestPanel as two new tabs.

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Clock, Webhook, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useDigestSchedules, useUpsertDigestSchedule, useDeleteDigestSchedule,
  useEscalationSinks, useUpsertEscalationSink, useDeleteEscalationSink,
  useEscalationEvents,
  type DigestCadence, type DigestCohort,
} from "@/hooks/useLegalConnectAutomation";

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return "—"; }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DigestSchedulesPanel({ orgId }: { orgId?: string | null }) {
  const list = useDigestSchedules(orgId);
  const upsert = useUpsertDigestSchedule(orgId);
  const remove = useDeleteDigestSchedule(orgId);

  const [cohort, setCohort] = useState<DigestCohort>("ops");
  const [cadence, setCadence] = useState<DigestCadence>("weekly");
  const [hour, setHour] = useState(14);
  const [weekday, setWeekday] = useState(1);

  const items = list.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Digest schedules
        </CardTitle>
        <CardDescription className="text-xs">
          A background job runs every 5 minutes and dispatches digests whose next run time is due. Times are UTC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-3 grid md:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Cohort</Label>
            <Select value={cohort} onValueChange={(v) => setCohort(v as DigestCohort)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ops">Ops</SelectItem>
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
          <div>
            <Label className="text-xs">Hour (UTC)</Label>
            <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="mt-1" />
          </div>
          {cadence === "weekly" && (
            <div>
              <Label className="text-xs">Weekday</Label>
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2 flex justify-end">
            <Button size="sm" onClick={() => upsert.mutate({ cohort, cadence, hour_utc: hour, weekday, enabled: true })} disabled={upsert.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add / update schedule
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedules yet. Add one above to start automated dispatch.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>When (UTC)</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs capitalize">{s.cohort.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs capitalize">{s.cadence}</TableCell>
                    <TableCell className="text-xs">
                      {s.cadence === "weekly" ? `${WEEKDAYS[s.weekday]} ` : ""}
                      {String(s.hour_utc).padStart(2, "0")}:00
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(v) => upsert.mutate({ id: s.id, cohort: s.cohort, cadence: s.cadence, hour_utc: s.hour_utc, weekday: s.weekday, enabled: v })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtAgo(s.last_run_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtAgo(s.next_run_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)} disabled={remove.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EscalationSinksPanel({ orgId }: { orgId?: string | null }) {
  const sinks = useEscalationSinks(orgId);
  const events = useEscalationEvents(orgId);
  const upsert = useUpsertEscalationSink(orgId);
  const remove = useDeleteEscalationSink(orgId);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"slack" | "webhook">("slack");
  const [target, setTarget] = useState("");
  const [hmac, setHmac] = useState("");
  const [threshold, setThreshold] = useState<"warn" | "critical">("critical");

  const items = sinks.data ?? [];
  const eventList = events.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" /> Escalation sinks
          </CardTitle>
          <CardDescription className="text-xs">
            When a digest run crosses thresholds (low success rate, recurring patterns, or many open alerts) we POST to these targets. Slack uses a standard incoming-webhook URL; webhook targets receive the full digest payload (optionally HMAC-signed via X-Lc-Signature).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-3 grid md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="#legal-connect-ops" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack webhook</SelectItem>
                  <SelectItem value="webhook">Generic webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Target URL</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Threshold</Label>
              <Select value={threshold} onValueChange={(v) => setThreshold(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Warn or worse</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "webhook" && (
              <div className="md:col-span-3">
                <Label className="text-xs">HMAC secret (optional)</Label>
                <Input value={hmac} onChange={(e) => setHmac(e.target.value)} placeholder="Used to sign payloads" className="mt-1" />
              </div>
            )}
            <div className="md:col-span-3 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  if (!name.trim() || !target.trim()) return;
                  upsert.mutate(
                    { name, kind, target, hmac_secret: hmac || null, severity_threshold: threshold, enabled: true },
                    { onSuccess: () => { setName(""); setTarget(""); setHmac(""); } },
                  );
                }}
                disabled={upsert.isPending || !name.trim() || !target.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add sink
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No escalation sinks configured.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Last fired</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell className="text-xs capitalize">{s.kind}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]" title={s.target}>{s.target}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{s.severity_threshold}</Badge></TableCell>
                      <TableCell>
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) =>
                            upsert.mutate({ id: s.id, name: s.name, kind: s.kind, target: s.target, hmac_secret: s.hmac_secret, severity_threshold: s.severity_threshold, enabled: v })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtAgo(s.last_fired_at)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)} disabled={remove.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Recent escalation events
          </CardTitle>
          <CardDescription className="text-xs">Latest 50 escalation attempts across all sinks.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No escalation events recorded.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reasons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventList.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtAgo(e.created_at)}</TableCell>
                      <TableCell className="text-xs capitalize">{e.trigger_kind}</TableCell>
                      <TableCell><Badge variant="outline" className={e.severity === "critical" ? "border-destructive/30 text-destructive" : ""}>{e.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{e.delivery_status}{e.delivery_error ? ` · ${e.delivery_error.slice(0, 60)}` : ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(e.payload?.reasons ?? []).join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
