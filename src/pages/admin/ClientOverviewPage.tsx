import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTenant, useUpdateTenant } from "@/hooks/useTenants";
import { usePartner } from "@/hooks/usePartners";
import { useApiLogs } from "@/hooks/useApiLogs";
import { useClientIntegrationConfigs } from "@/hooks/useClientIntegrationConfigs";
import { useInvoices } from "@/hooks/useInvoices";
import { useCampaignScripts } from "@/hooks/useCampaignScripts";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Five9WebhookCard } from "@/components/tenants/Five9WebhookCard";
import { CrmConnectionCard } from "@/components/tenants/CrmConnectionCard";
import { ReadinessChecklist } from "@/components/dashboard/ReadinessChecklist";
import { AIGuidanceCard } from "@/components/dashboard/AIGuidanceCard";
import { SystemHealthStrip } from "@/components/dashboard/SystemHealthStrip";
import { QuickActionsGrid } from "@/components/dashboard/QuickActionsGrid";
import {
  fetchClientReadiness,
  type ClientReadiness,
} from "@/lib/readiness/computeCampaignReadiness";
import type { IntegrationConfigs } from "@/types/integrations";
import type { CrmType, TenantStatus, NotificationTriggers } from "@/types/database";
import {
  ArrowLeft,
  Workflow,
  Building2,
  Activity,
  PhoneCall,
  AlertCircle,
  CheckCircle2,
  Map,
  FileText,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";

const crmLabels: Record<CrmType, string> = {
  clio: "Clio",
  workiz: "Workiz",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  zendesk: "Zendesk",
  generic_rest: "Generic REST",
  other: "Other",
};

export default function ClientOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useTenant(id || "");
  const { data: partner } = usePartner(tenant?.partner_id || "");
  const { data: logs = [] } = useApiLogs({ tenantId: id, limit: 10 });
  const { configs, saveConfigs } = useClientIntegrationConfigs(id || "");
  const updateTenant = useUpdateTenant();
  const { data: allInvoices = [] } = useInvoices();
  const { data: campaignScripts = [] } = useCampaignScripts();

  const [readiness, setReadiness] = useState<ClientReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);

  const clientInvoices = allInvoices.filter((inv: any) => inv.tenant_id === id);
  const clientScripts = campaignScripts.filter((cs: any) => cs.tenant_id === id);

  useEffect(() => {
    if (!id) return;
    setReadinessLoading(true);
    fetchClientReadiness(id).then((r) => {
      setReadiness(r);
      setReadinessLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
        </Button>
      </div>
    );
  }

  const webhookSecret = (configs as IntegrationConfigs)?.clio?.webhookSecret || "";

  const handleWebhookSecretChange = (secret: string) => {
    const next = { ...(configs || {}), clio: { ...(configs?.clio || {}), webhookSecret: secret } } as IntegrationConfigs;
    saveConfigs(next);
  };

  const handleCrmConfigChange = (crm: "clio" | "mycase", config: Record<string, unknown>) => {
    const next = { ...(configs || {}), [crm]: config } as IntegrationConfigs;
    saveConfigs(next);
  };

  const handleNotificationToggle = (key: keyof NotificationTriggers, value: boolean) => {
    const triggers = { ...tenant.notification_triggers, [key]: value };
    updateTenant.mutate({ id: tenant.id, data: { notification_triggers: triggers } });
  };

  const webhookDestinations = [
    { label: "Zapier", value: tenant.zapier_webhook_url },
    { label: "Make", value: tenant.make_webhook_url },
    { label: "n8n", value: tenant.n8n_webhook_url },
    { label: "Pabbly", value: tenant.pabbly_webhook_url },
    { label: "Power Automate", value: tenant.power_automate_webhook_url },
  ].filter((d) => d.value);

  const activeScripts = clientScripts.filter((cs: any) => cs.is_active).length;
  const recentLogCount = logs.length;
  const lastLogAt = logs[0]?.created_at;
  const openInvoices = clientInvoices.filter((inv: any) => inv.status !== "paid").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={tenant.name}
        subtitle={tenant.id}
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        }
        breadcrumb={
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-muted-foreground gap-1.5 -ml-2 h-7">
            <ArrowLeft className="h-3.5 w-3.5" /> Clients
          </Button>
        }
      >
        <StatusBadge variant={tenant.crm_type as CrmType}>
          {crmLabels[tenant.crm_type]}
        </StatusBadge>
        <StatusBadge variant={tenant.status as TenantStatus} dot>
          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
        </StatusBadge>
        {partner && (
          <Link to={`/admin/partners/${partner.id}`}>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
              Partner: {partner.name}
            </Badge>
          </Link>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/clients/${tenant.id}/legal-connect`}>Legal Connect</Link>
        </Button>
        {/* Phase D: Five9 Overlay surface retired — link removed. The route
            still silent-redirects to /admin/campaigns for any external bookmark. */}
      </PageHeader>

      {/* Setup Progress + AI Guidance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReadinessChecklist readiness={readiness} loading={readinessLoading} title="Setup Progress" />
        <AIGuidanceCard readiness={readiness} />
      </div>

      {/* System Health */}
      <SystemHealthStrip organizationId={tenant.organization_id} />

      {/* Live Operations strip */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-4">Live Operations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={`/admin/scripts?tenant=${tenant.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <PhoneCall className="h-4 w-4 text-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Active campaigns</p>
              <p className="text-lg font-semibold text-foreground">{activeScripts}</p>
            </div>
          </Link>
          <Link to={`/admin/logs?tenant=${tenant.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <Activity className="h-4 w-4 text-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Recent events</p>
              <p className="text-lg font-semibold text-foreground">{recentLogCount}</p>
            </div>
          </Link>
          <Link to={`/admin/clients/${tenant.id}/legal-connect`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            {configs?.clio?.oauthTokenId || configs?.mycase?.apiKeyId ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-warning" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="text-lg font-semibold text-foreground">
                {(configs?.clio?.enabled && "Clio") || (configs?.mycase?.enabled && "MyCase") || "None"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <FileText className="h-4 w-4 text-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Last activity</p>
              <p className="text-sm font-semibold text-foreground">
                {lastLogAt ? format(new Date(lastLogAt), "MMM d, HH:mm") : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — client scoped */}
      <QuickActionsGrid clientId={tenant.id} />

      {/* More details */}
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card">
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <span className="text-sm font-semibold tracking-tight text-foreground">More details — integrations, scripts, billing</span>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* Legal Connect cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Legal Connect setup</h3>
              <Five9WebhookCard
                tenantId={tenant.id}
                webhookSecret={webhookSecret}
                onWebhookSecretChange={handleWebhookSecretChange}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <CrmConnectionCard
                  crm="clio"
                  tenantId={tenant.id}
                  config={configs?.clio as unknown as Record<string, unknown> | undefined}
                  onConfigChange={(c) => handleCrmConfigChange("clio", c)}
                />
                <CrmConnectionCard
                  crm="mycase"
                  tenantId={tenant.id}
                  config={configs?.mycase as unknown as Record<string, unknown> | undefined}
                  onConfigChange={(c) => handleCrmConfigChange("mycase", c)}
                />
              </div>
              {webhookDestinations.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Workflow webhook destinations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {webhookDestinations.map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{d.label}</span>
                        <Badge variant="outline" className="font-mono text-xs truncate max-w-[180px]">
                          {d.value}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Workflow Automations */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Workflow automations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: "intake_created" as const, label: "Send on intake created" },
                  { key: "call_ended" as const, label: "Send on call ended" },
                  { key: "contact_updated" as const, label: "Send on CRM update" },
                ] as const).map((trigger) => (
                  <div key={trigger.key} className="flex items-center justify-between">
                    <Label className="text-sm">{trigger.label}</Label>
                    <Switch
                      checked={!!tenant.notification_triggers?.[trigger.key]}
                      onCheckedChange={(v) => handleNotificationToggle(trigger.key, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Script mappings */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">DNIS / Campaign → Script mappings</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/admin/scripts")}>
                    Manage all routes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {clientScripts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No script mappings yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>DNIS</TableHead>
                        <TableHead>Campaign ID</TableHead>
                        <TableHead>Script ID</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientScripts.map((cs: any) => (
                        <TableRow key={cs.id} className="border-border">
                          <TableCell className="font-mono text-sm">{cs.dnis || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{cs.five9_campaign_id || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{cs.script_id?.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <Badge variant={cs.is_active ? "default" : "secondary"}>
                              {cs.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent API logs */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Recent API logs</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/logs?tenant=${tenant.id}`}>View all</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent API activity.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs">Endpoint</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.slice(0, 8).map((log) => (
                        <TableRow key={log.id} className="border-border">
                          <TableCell className="text-xs font-mono truncate max-w-[140px]">{log.endpoint}</TableCell>
                          <TableCell>
                            <StatusBadge variant={log.status === "success" ? "active" : "inactive"} dot>
                              {log.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Billing */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Billing ({openInvoices} open)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {clientInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No invoices for this client yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Issue date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientInvoices.map((inv: any) => (
                        <TableRow key={inv.id} className="border-border">
                          <TableCell className="text-sm">{format(new Date(inv.issue_date), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${Number(inv.total_amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
