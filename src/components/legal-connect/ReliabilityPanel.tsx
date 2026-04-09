import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  HeartPulse, Skull, BarChart3, PauseCircle, RefreshCw, Play,
  AlertTriangle, CheckCircle2, XCircle, Shield, RotateCcw,
} from "lucide-react";
import {
  useLegalWebhookHealth,
  useLegalDeadLetterQueue,
  useLegalFailureClassifications,
  useLegalTenantConfig,
  useReplayJob,
  useToggleOutageMode,
  useRenewWebhook,
} from "@/hooks/useLegalConnect";

interface ReliabilityPanelProps {
  clientId?: string;
}

const classificationColors: Record<string, string> = {
  invalid_signature: "bg-destructive/15 text-destructive border-destructive/30",
  expired_subscription: "bg-warning/15 text-warning border-warning/30",
  renewal_failed: "bg-destructive/15 text-destructive border-destructive/30",
  provider_unavailable: "bg-warning/15 text-warning border-warning/30",
  token_refresh_failed: "bg-destructive/15 text-destructive border-destructive/30",
  unsupported_action: "bg-muted text-muted-foreground border-border",
  payload_validation_failed: "bg-destructive/15 text-destructive border-destructive/30",
  duplicate_event: "bg-muted text-muted-foreground border-border",
  rate_limited: "bg-warning/15 text-warning border-warning/30",
  transient_network_error: "bg-warning/15 text-warning border-warning/30",
  downstream_write_failed: "bg-destructive/15 text-destructive border-destructive/30",
  internal_processing_error: "bg-destructive/15 text-destructive border-destructive/30",
  dead_lettered: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ReliabilityPanel({ clientId }: ReliabilityPanelProps) {
  const [reliabilityTab, setReliabilityTab] = useState("health");

  const { data: webhookHealth, isLoading: healthLoading } = useLegalWebhookHealth(clientId);
  const { data: deadLetterJobs, isLoading: dlLoading } = useLegalDeadLetterQueue(clientId);
  const { data: failures, isLoading: failuresLoading } = useLegalFailureClassifications(clientId);
  const { data: tenantConfig } = useLegalTenantConfig(clientId);

  const replayJob = useReplayJob();
  const toggleOutage = useToggleOutageMode();
  const renewWebhook = useRenewWebhook();

  const isOutageMode = (tenantConfig as any)?.outage_mode ?? false;

  // Failure classification breakdown
  const classificationCounts = (failures ?? []).reduce((acc, f) => {
    const key = (f as any).classification ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Outage mode banner */}
      {isOutageMode && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <PauseCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Outage Mode Active</p>
              <p className="text-xs text-muted-foreground">Job processing is paused. {webhookHealth?.pausedCount ?? 0} jobs buffered.</p>
            </div>
            {clientId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleOutage.mutate({ clientId, outageMode: false })}
                disabled={toggleOutage.isPending}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" /> Resume
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <HeartPulse className="h-5 w-5 text-success" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {healthLoading ? <Skeleton className="h-6 w-8" /> : (webhookHealth?.subscriptions?.filter((s: any) => s.status === "active").length ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Active Webhooks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Skull className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {healthLoading ? <Skeleton className="h-6 w-8" /> : (webhookHealth?.deadLetterCount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Dead Letters</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {failuresLoading ? <Skeleton className="h-6 w-8" /> : (failures?.length ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Recent Failures</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PauseCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {healthLoading ? <Skeleton className="h-6 w-8" /> : (webhookHealth?.pausedCount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Paused Jobs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outage toggle */}
      {clientId && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Outage Mode</p>
                <p className="text-xs text-muted-foreground">Pause all job processing for this client</p>
              </div>
            </div>
            <Switch
              checked={isOutageMode}
              onCheckedChange={(checked) => toggleOutage.mutate({ clientId, outageMode: checked })}
              disabled={toggleOutage.isPending}
            />
          </CardContent>
        </Card>
      )}

      <Tabs value={reliabilityTab} onValueChange={setReliabilityTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="health" className="text-xs">Webhook Health</TabsTrigger>
          <TabsTrigger value="deadletter" className="text-xs">Dead Letter Queue</TabsTrigger>
          <TabsTrigger value="failures" className="text-xs">Failure Breakdown</TabsTrigger>
        </TabsList>

        {/* Webhook Health */}
        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Webhook Subscriptions</CardTitle>
              <CardDescription>Monitor subscription health, expiry, and renewal status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground/80">Provider</TableHead>
                    <TableHead className="text-foreground/80">Status</TableHead>
                    <TableHead className="text-foreground/80">Expires</TableHead>
                    <TableHead className="text-foreground/80">Renew After</TableHead>
                    <TableHead className="text-foreground/80">Last Delivery</TableHead>
                    <TableHead className="text-foreground/80">Failures</TableHead>
                    <TableHead className="text-foreground/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !webhookHealth?.subscriptions || webhookHealth.subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        No webhook subscriptions configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookHealth.subscriptions.map((sub: any) => {
                      const isExpiring = sub.expires_at && new Date(sub.expires_at) < new Date(Date.now() + 48 * 60 * 60 * 1000);
                      return (
                        <TableRow key={sub.id} className="border-border">
                          <TableCell className="font-medium text-foreground capitalize">{sub.provider}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                sub.status === "active"
                                  ? "bg-success/15 text-success border-success/30"
                                  : sub.status === "unhealthy"
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-xs ${isExpiring ? "text-warning font-medium" : "text-muted-foreground"}`}>
                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—"}
                            {isExpiring && " ⚠️"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {sub.renew_after ? new Date(sub.renew_after).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {sub.last_delivery_at ? new Date(sub.last_delivery_at).toLocaleString() : "never"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{sub.failure_count ?? 0}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => renewWebhook.mutate(sub.id)}
                              disabled={renewWebhook.isPending}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" /> Renew
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead Letter Queue */}
        <TabsContent value="deadletter" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dead Letter Queue</CardTitle>
              <CardDescription>Failed jobs that exceeded max retry attempts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground/80">Job Type</TableHead>
                    <TableHead className="text-foreground/80">Provider</TableHead>
                    <TableHead className="text-foreground/80">Classification</TableHead>
                    <TableHead className="text-foreground/80">Attempts</TableHead>
                    <TableHead className="text-foreground/80">Failed At</TableHead>
                    <TableHead className="text-foreground/80">Error</TableHead>
                    <TableHead className="text-foreground/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !deadLetterJobs || deadLetterJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
                        No dead-lettered jobs.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deadLetterJobs.map((job: any) => (
                      <TableRow key={job.id} className="border-border">
                        <TableCell className="font-medium text-foreground">{job.job_type}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">{job.provider}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${classificationColors[job.failure_classification] ?? "bg-muted text-muted-foreground border-border"}`}
                          >
                            {(job.failure_classification ?? "unknown").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{job.attempt_count}/{job.max_attempts}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {job.failed_at ? new Date(job.failed_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={job.failure_reason}>
                          {job.failure_reason ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => replayJob.mutate({ job_id: job.id })}
                              disabled={replayJob.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Replay
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure Breakdown */}
        <TabsContent value="failures" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Classification Summary</CardTitle>
                <CardDescription>Breakdown of recent failure types</CardDescription>
              </CardHeader>
              <CardContent>
                {failuresLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : Object.keys(classificationCounts).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failures recorded</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(classificationCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([key, count]) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                          <Badge variant="outline" className={`text-xs ${classificationColors[key] ?? "bg-muted text-muted-foreground border-border"}`}>
                            {key.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Failures</CardTitle>
                <CardDescription>Last 10 failure events</CardDescription>
              </CardHeader>
              <CardContent>
                {failuresLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : !failures || failures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failures recorded</p>
                ) : (
                  <div className="space-y-2">
                    {failures.slice(0, 10).map((f: any) => (
                      <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {(f.classification ?? "unknown").replace(/_/g, " ")}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{f.notes ?? "—"}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(f.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
