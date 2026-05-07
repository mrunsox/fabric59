// Phase 11 — Compliance & hardening panel for Legal Connect.
// Tabs: Retention · Secret rotation · Webhook failures · Audit log

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, KeyRound, AlertTriangle, History, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  RETENTION_CATEGORIES,
  useRetentionPolicies, useUpsertRetentionPolicy, useRunRetentionCleanup,
  useSecretRotations, useRecordSecretRotation,
  useWebhookFailures, useAuditOverview,
  type RetentionCategory,
} from "@/hooks/useLegalConnectCompliance";

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return "—"; }
}

export default function CompliancePanel({ orgId }: { orgId?: string | null }) {
  const policiesQ = useRetentionPolicies(orgId);
  const upsertPolicy = useUpsertRetentionPolicy(orgId);
  const runCleanup = useRunRetentionCleanup(orgId);
  const rotationsQ = useSecretRotations(orgId);
  const recordRotation = useRecordSecretRotation(orgId);
  const failuresQ = useWebhookFailures(orgId);
  const [auditSource, setAuditSource] = useState("all");
  const auditQ = useAuditOverview(orgId, null, auditSource);

  const policiesByCat = new Map((policiesQ.data ?? []).map((p) => [p.category, p]));

  const [rotKind, setRotKind] = useState<"cron_secret" | "sink_hmac" | "webhook_signing" | "provider_credential" | "other">("cron_secret");
  const [rotNotes, setRotNotes] = useState("");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Compliance &amp; hardening
        </CardTitle>
        <CardDescription className="text-xs">
          Retention windows, secret rotation log, rejected webhook callbacks, and tenant-aware audit trail for sensitive ops actions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="retention" className="space-y-4">
          <TabsList>
            <TabsTrigger value="retention"><History className="h-3.5 w-3.5 mr-1.5" />Retention</TabsTrigger>
            <TabsTrigger value="rotations"><KeyRound className="h-3.5 w-3.5 mr-1.5" />Secret rotations</TabsTrigger>
            <TabsTrigger value="failures"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Webhook failures</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          {/* RETENTION */}
          <TabsContent value="retention" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => runCleanup.mutate()} disabled={runCleanup.isPending}>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Run cleanup now
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[120px]">Days</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[150px]">Updated</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RETENTION_CATEGORIES.map((c) => {
                    const p = policiesByCat.get(c.key);
                    const days = p?.retention_days ?? c.defaultDays;
                    const action = (p?.action ?? c.defaultAction) as "delete" | "redact" | "archive";
                    return (
                      <RetentionRow key={c.key}
                        cat={c.key} label={c.label} hint={c.hint}
                        days={days} action={action}
                        notes={p?.notes ?? ""}
                        updatedAt={p?.updated_at}
                        updatedBy={p?.updated_by_name}
                        configured={!!p}
                        onSave={(d, a, n) => upsertPolicy.mutate({ category: c.key, retention_days: d, action: a, notes: n })}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              A daily cron job (03:15 UTC) prunes/redacts data per these policies. Expired ack tokens are always purged regardless of policy.
            </p>
          </TabsContent>

          {/* ROTATIONS */}
          <TabsContent value="rotations" className="space-y-3">
            <div className="rounded-lg border border-border p-3 grid md:grid-cols-5 gap-3 items-end">
              <div>
                <Label className="text-xs">Secret kind</Label>
                <Select value={rotKind} onValueChange={(v) => setRotKind(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cron_secret">Cron secret</SelectItem>
                    <SelectItem value="sink_hmac">Sink HMAC</SelectItem>
                    <SelectItem value="webhook_signing">Webhook signing</SelectItem>
                    <SelectItem value="provider_credential">Provider credential</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Notes</Label>
                <Input value={rotNotes} onChange={(e) => setRotNotes(e.target.value)} placeholder="What was rotated, why, and who was notified" className="mt-1" />
              </div>
              <Button size="sm" onClick={() => { recordRotation.mutate({ secret_kind: rotKind, notes: rotNotes }); setRotNotes(""); }} disabled={recordRotation.isPending}>
                Record rotation
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Secrets themselves are stored in app_config / Cloud secrets. Rotation here records the event for audit. Update the underlying secret via the standard secret tools, then record it here.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rotationsQ.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtAgo(r.created_at)}</TableCell>
                      <TableCell className="text-xs capitalize">{r.secret_kind.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs">{r.rotated_by_name ?? "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{r.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(rotationsQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No rotations recorded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* WEBHOOK FAILURES */}
          <TabsContent value="failures">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>UA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(failuresQ.data ?? []).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtAgo(f.created_at)}</TableCell>
                      <TableCell className="text-xs">{f.endpoint}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{f.reason}</Badge></TableCell>
                      <TableCell className="text-xs">{f.signature_present ? "present" : "missing"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.ip_address ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[260px]" title={f.user_agent ?? ""}>{f.user_agent ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(failuresQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground">No rejected callbacks. </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* AUDIT LOG */}
          <TabsContent value="audit" className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Source</Label>
              <Select value={auditSource} onValueChange={setAuditSource}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="cron">Cron</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{auditQ.data?.length ?? 0} entries</span>
            </div>
            <div className="rounded-lg border border-border overflow-hidden max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditQ.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtAgo(a.created_at)}</TableCell>
                      <TableCell className="text-xs font-mono">{a.action}</TableCell>
                      <TableCell className="text-xs">{a.tenant_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{a.actor_name ?? a.actor_email ?? "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{a.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={a.entity_id ?? ""}>{a.entity_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(auditQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground">No audit entries.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RetentionRow({
  cat, label, hint, days, action, notes, updatedAt, updatedBy, configured, onSave,
}: {
  cat: RetentionCategory; label: string; hint: string;
  days: number; action: "delete" | "redact" | "archive";
  notes: string; updatedAt?: string; updatedBy?: string | null; configured: boolean;
  onSave: (d: number, a: "delete" | "redact" | "archive", n: string | null) => void;
}) {
  const [d, setD] = useState(days);
  const [a, setA] = useState(action);
  const [n, setN] = useState(notes);
  const dirty = d !== days || a !== action || (n ?? "") !== (notes ?? "");
  return (
    <TableRow>
      <TableCell>
        <div className="text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </TableCell>
      <TableCell><Input type="number" min={1} max={3650} value={d} onChange={(e) => setD(Number(e.target.value))} className="h-8 text-xs" /></TableCell>
      <TableCell>
        <Select value={a} onValueChange={(v) => setA(v as any)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="redact">Redact (digest only)</SelectItem>
            <SelectItem value="archive">Archive (manual)</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input value={n} onChange={(e) => setN(e.target.value)} className="h-8 text-xs" /></TableCell>
      <TableCell className="text-[11px] text-muted-foreground">
        {configured ? <>{fmtAgo(updatedAt)}<br />{updatedBy}</> : <span className="italic">default</span>}
      </TableCell>
      <TableCell>
        <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => onSave(d, a, n || null)}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
