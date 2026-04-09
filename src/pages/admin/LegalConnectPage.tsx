import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard, Plug, Megaphone, Shield, Map, Activity, AlertTriangle,
  Sparkles, TestTube2, FileText, RefreshCw, Wifi, WifiOff, CheckCircle2, XCircle, Eye, Plus, HeartPulse,
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  useLegalConnections, useLegalCampaigns, useLegalSyncJobs, useLegalReviewQueue,
  useLegalEventLog, useLegalConflicts, useLegalProviderCapabilities, useLegalPolicyProfiles,
  useLegalConnectClients,
} from "@/hooks/useLegalConnect";
import ClientSelector from "@/components/legal-connect/ClientSelector";
import LegalConnectClientSetup from "@/components/legal-connect/LegalConnectClientSetup";
import ReliabilityPanel from "@/components/legal-connect/ReliabilityPanel";
import TestingPanel from "@/components/legal-connect/TestingPanel";
import ExamplesPanel from "@/components/legal-connect/ExamplesPanel";
import AISetupPanel from "@/components/legal-connect/AISetupPanel";
import { toast } from "sonner";

// ── Status badge helper ──────────────────────────────────────────────

const statusColor: Record<string, string> = {
  connected: "bg-success/15 text-success border-success/30",
  active: "bg-success/15 text-success border-success/30",
  succeeded: "bg-success/15 text-success border-success/30",
  approved: "bg-success/15 text-success border-success/30",
  processed: "bg-success/15 text-success border-success/30",
  not_connected: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/15 text-warning border-warning/30",
  queued: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-warning/15 text-warning border-warning/30",
  in_review: "bg-warning/15 text-warning border-warning/30",
  open: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  revoked: "bg-destructive/15 text-destructive border-destructive/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  dead_letter: "bg-destructive/15 text-destructive border-destructive/30",
  testing: "bg-primary/15 text-primary border-primary/30",
  review: "bg-accent text-accent-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${statusColor[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function StatCard({ label, value, icon: Icon, loading }: { label: string; value: string | number; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          {loading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const tabMeta = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "connections", label: "Connections", icon: Plug },
  { value: "campaigns", label: "Campaigns", icon: Megaphone },
  { value: "policies", label: "Policies", icon: Shield },
  { value: "mappings", label: "Mappings", icon: Map },
  { value: "sync", label: "Sync Activity", icon: Activity },
  { value: "review", label: "Review Queue", icon: AlertTriangle },
  { value: "reliability", label: "Reliability", icon: HeartPulse },
  { value: "ai", label: "AI Setup", icon: Sparkles },
  { value: "testing", label: "Testing", icon: TestTube2 },
  { value: "logs", label: "Logs", icon: FileText },
];

export default function LegalConnectPage() {
  const [tab, setTab] = useState("overview");
  const [selectedClient, setSelectedClient] = useState("all");
  const [setupOpen, setSetupOpen] = useState(false);

  const clientId = selectedClient === "all" ? undefined : selectedClient;
  const selectedClientName = undefined; // resolved below from clients data

  // Client list for selector
  const { data: clients, isLoading: clientsLoading } = useLegalConnectClients();

  // All data hooks now accept optional clientId
  const { data: connections, isLoading: connLoading } = useLegalConnections(clientId);
  const { data: campaigns, isLoading: campLoading } = useLegalCampaigns(clientId);
  const { data: syncJobs, isLoading: syncLoading } = useLegalSyncJobs({ limit: 50, client_id: clientId });
  const { data: reviewItems, isLoading: reviewLoading } = useLegalReviewQueue(undefined, clientId);
  const { data: eventLog, isLoading: logLoading } = useLegalEventLog({ limit: 50, client_id: clientId });
  const { data: conflicts } = useLegalConflicts("open", clientId);
  const { data: capabilities } = useLegalProviderCapabilities();
  const { data: policyProfiles, isLoading: policiesLoading } = useLegalPolicyProfiles(clientId);

  const resolvedClientName = clients?.find((c) => c.id === selectedClient)?.name;

  // derived stats
  const connectedCount = connections?.filter((c) => c.status === "connected").length ?? 0;
  const activeCampaigns = campaigns?.filter((c) => c.active).length ?? 0;
  const pendingReviews = reviewItems?.filter((r) => r.status === "pending").length ?? 0;
  const failedJobs = syncJobs?.filter((j) => j.status === "failed" || j.status === "dead_letter").length ?? 0;
  const succeededJobs = syncJobs?.filter((j) => j.status === "succeeded").length ?? 0;
  const totalJobs = syncJobs?.length ?? 0;
  const successRate = totalJobs > 0 ? Math.round((succeededJobs / totalJobs) * 100) : 0;

  const handleSetupComplete = (config: { provider: string; campaignTypes: string[]; policyDefaults: any }) => {
    toast.success(`Setup checklist generated for ${resolvedClientName ?? "client"} with ${config.provider}`);
  };

  return (
    <>
      <SEOHead title="Legal Connect — Fabric59" description="Enterprise legal CRM integration hub" />

      <div className="space-y-6">
        {/* Header with client selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Legal Connect</h1>
            <p className="text-sm text-muted-foreground mt-1">Five9 ↔ Fabric59 ↔ Clio / MyCase integration hub</p>
          </div>
          <div className="flex items-center gap-3">
            <ClientSelector
              clients={clients ?? []}
              value={selectedClient}
              onChange={setSelectedClient}
              isLoading={clientsLoading}
            />
            {clientId && (
              <Button size="sm" onClick={() => setSetupOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Setup Wizard
              </Button>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {tabMeta.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs px-3 py-1.5">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── OVERVIEW ─────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Connected Providers" value={connectedCount} icon={Plug} loading={connLoading} />
              <StatCard label="Active Campaigns" value={activeCampaigns} icon={Megaphone} loading={campLoading} />
              <StatCard label="Pending Reviews" value={pendingReviews} icon={AlertTriangle} loading={reviewLoading} />
              <StatCard label="Failed Sync Jobs" value={failedJobs} icon={XCircle} loading={syncLoading} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  {syncLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-foreground">{successRate}%</span>
                      <span className="text-sm text-muted-foreground">of {totalJobs} jobs</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Open Conflicts</CardTitle>
                </CardHeader>
                <CardContent>
                  {conflicts && conflicts.length > 0 ? (
                    <ul className="space-y-2">
                      {conflicts.slice(0, 5).map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <StatusBadge status={c.severity} />
                          <span className="text-foreground truncate">{c.conflict_type.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground text-xs ml-auto">{c.provider}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No open conflicts</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Client overview cards when viewing all */}
            {!clientId && clients && clients.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Clients</CardTitle>
                  <CardDescription>{clients.length} clients configured</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {clients.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedClient(c.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {c.connectedProviders.map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                            ))}
                            {c.connectedProviders.length === 0 && (
                              <span className="text-xs text-muted-foreground">No connections</span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={c.onboardingStatus === "complete" ? "connected" : c.onboardingStatus === "in_progress" ? "pending" : "not_connected"} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Provider Capabilities</CardTitle>
                <CardDescription>Global capability matrix across supported providers</CardDescription>
              </CardHeader>
              <CardContent>
                {capabilities && capabilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["clio", "mycase"].map((prov) => {
                      const caps = capabilities.filter((c) => c.provider === prov);
                      if (caps.length === 0) return null;
                      return (
                        <div key={prov}>
                          <h4 className="text-sm font-semibold text-foreground capitalize mb-2">{prov}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {caps.map((c) => (
                              <Badge key={c.id} variant="outline" className={`text-xs ${c.supported ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
                                {c.capability_key}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No capability data loaded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CONNECTIONS ───────────────────────────────────── */}
          <TabsContent value="connections" className="space-y-6 mt-4">
            {["five9", "clio", "mycase"].map((provider) => {
              const provConns = connections?.filter((c) => c.provider === provider) ?? [];
              return (
                <Card key={provider}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">{provider === "five9" ? "Five9" : provider === "clio" ? "Clio" : "MyCase"}</CardTitle>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Plug className="h-3.5 w-3.5 mr-1.5" /> Connect
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {connLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : provConns.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No {provider} connections configured</p>
                    ) : (
                      <div className="space-y-3">
                        {provConns.map((conn) => (
                          <div key={conn.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                            {conn.status === "connected" ? (
                              <Wifi className="h-4 w-4 text-success" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-destructive" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{conn.connection_name || conn.provider}</p>
                                {(conn as any).is_sandbox && <Badge variant="outline" className="text-[10px] px-1.5 py-0">sandbox</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {conn.auth_type ?? "—"} · Last connected {conn.last_connected_at ? new Date(conn.last_connected_at).toLocaleDateString() : "never"}
                              </p>
                            </div>
                            <StatusBadge status={conn.status} />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-xs h-7"><RefreshCw className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7"><Eye className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── CAMPAIGNS ────────────────────────────────────── */}
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Five9 Campaign Mappings</h2>
              <Button size="sm"><Megaphone className="h-3.5 w-3.5 mr-1.5" /> Add Campaign</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground/80">Campaign</TableHead>
                      <TableHead className="text-foreground/80">Type</TableHead>
                      <TableHead className="text-foreground/80">DNIS</TableHead>
                      <TableHead className="text-foreground/80">Provider</TableHead>
                      <TableHead className="text-foreground/80">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !campaigns || campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          No campaign mappings yet. Add a Five9 campaign to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((c) => (
                        <TableRow key={c.id} className="border-border cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium text-foreground">{c.five9_campaign_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.campaign_type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{c.dnis || "—"}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{c.provider_connection_id ? "linked" : "—"}</TableCell>
                          <TableCell><StatusBadge status={c.active ? "active" : "not_connected"} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── POLICIES ─────────────────────────────────────── */}
          <TabsContent value="policies" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Policy Profiles</h2>
              <Button size="sm"><Shield className="h-3.5 w-3.5 mr-1.5" /> New Profile</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground/80">Name</TableHead>
                      <TableHead className="text-foreground/80">Default</TableHead>
                      <TableHead className="text-foreground/80">Contact Create</TableHead>
                      <TableHead className="text-foreground/80">Matter Create</TableHead>
                      <TableHead className="text-foreground/80">Ambiguous Match</TableHead>
                      <TableHead className="text-foreground/80">Duplicate Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policiesLoading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !policyProfiles || policyProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No policy profiles created. Create one to control data pass-through rules.
                        </TableCell>
                      </TableRow>
                    ) : (
                      policyProfiles.map((p) => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                          <TableCell>{p.is_default ? <CheckCircle2 className="h-4 w-4 text-success" /> : "—"}</TableCell>
                          <TableCell>{p.allow_contact_create ? "✓" : "✗"}</TableCell>
                          <TableCell>{p.allow_matter_create ? "✓" : "✗"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{p.ambiguous_match_mode}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{p.duplicate_prevention_mode}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MAPPINGS ─────────────────────────────────────── */}
          <TabsContent value="mappings" className="mt-4">
            <Tabs defaultValue="dispositions">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="dispositions" className="text-xs">Dispositions</TabsTrigger>
                <TabsTrigger value="variables" className="text-xs">Call Variables</TabsTrigger>
                <TabsTrigger value="fields" className="text-xs">CRM Fields</TabsTrigger>
                <TabsTrigger value="statuses" className="text-xs">Status Mappings</TabsTrigger>
              </TabsList>
              {["dispositions", "variables", "fields", "statuses"].map((sub) => (
                <TabsContent key={sub} value={sub} className="mt-4">
                  <Card>
                    <CardContent className="flex items-center justify-center py-16">
                      <div className="text-center space-y-2">
                        <Map className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground capitalize">{sub.replace(/_/g, " ")} mapping editor — coming in Phase 1E</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* ── SYNC ACTIVITY ────────────────────────────────── */}
          <TabsContent value="sync" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-foreground">Sync Jobs</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground/80">Job Type</TableHead>
                      <TableHead className="text-foreground/80">Provider</TableHead>
                      <TableHead className="text-foreground/80">Direction</TableHead>
                      <TableHead className="text-foreground/80">Status</TableHead>
                      <TableHead className="text-foreground/80">Attempts</TableHead>
                      <TableHead className="text-foreground/80">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !syncJobs || syncJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No sync jobs yet. Jobs will appear here once integrations are active.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncJobs.map((j) => (
                        <TableRow key={j.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{j.job_type}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{j.provider}</TableCell>
                          <TableCell className="text-muted-foreground">{j.direction}</TableCell>
                          <TableCell><StatusBadge status={j.status} /></TableCell>
                          <TableCell className="text-muted-foreground">{j.attempt_count}/{j.max_attempts}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(j.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── REVIEW QUEUE ─────────────────────────────────── */}
          <TabsContent value="review" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-foreground">Review Queue</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground/80">Type</TableHead>
                      <TableHead className="text-foreground/80">Title</TableHead>
                      <TableHead className="text-foreground/80">Provider</TableHead>
                      <TableHead className="text-foreground/80">Status</TableHead>
                      <TableHead className="text-foreground/80">Created</TableHead>
                      <TableHead className="text-foreground/80">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !reviewItems || reviewItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No items pending review.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviewItems.map((r) => (
                        <TableRow key={r.id} className="border-border">
                          <TableCell><Badge variant="outline" className="text-xs">{r.review_type}</Badge></TableCell>
                          <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{r.provider}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="text-xs h-7">Approve</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7">Reject</Button>
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

          {/* ── RELIABILITY ──────────────────────────────────── */}
          <TabsContent value="reliability" className="mt-4">
            <ReliabilityPanel clientId={clientId} />
          </TabsContent>

          {/* ── AI SETUP ─────────────────────────────────────── */}
          <TabsContent value="ai" className="mt-4">
            <AISetupPanel clientId={clientId} />
          </TabsContent>

          {/* ── TESTING ──────────────────────────────────────── */}
          <TabsContent value="testing" className="mt-4">
            <TestingPanel clientId={clientId} />
          </TabsContent>

          {/* ── LOGS ─────────────────────────────────────────── */}
          <TabsContent value="logs" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-foreground">Event Log</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground/80">Source</TableHead>
                      <TableHead className="text-foreground/80">Event Type</TableHead>
                      <TableHead className="text-foreground/80">Provider</TableHead>
                      <TableHead className="text-foreground/80">Direction</TableHead>
                      <TableHead className="text-foreground/80">Status</TableHead>
                      <TableHead className="text-foreground/80">Call ID</TableHead>
                      <TableHead className="text-foreground/80">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !eventLog || eventLog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          No events logged yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventLog.map((e) => (
                        <TableRow key={e.id} className="border-border">
                          <TableCell className="text-foreground">{e.source_type}</TableCell>
                          <TableCell className="font-medium text-foreground">{e.source_event_type}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{e.provider}</TableCell>
                          <TableCell className="text-muted-foreground">{e.direction}</TableCell>
                          <TableCell><StatusBadge status={e.processing_status} /></TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{e.call_id || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(e.received_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Client onboarding wizard */}
      <LegalConnectClientSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        clientName={resolvedClientName}
        onComplete={handleSetupComplete}
      />
    </>
  );
}
