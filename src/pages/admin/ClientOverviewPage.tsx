import { useParams, Link, useNavigate } from "react-router-dom";
import { useTenant, useUpdateTenant } from "@/hooks/useTenants";
import { usePartner } from "@/hooks/usePartners";
import { useApiLogs, useApiLogStats } from "@/hooks/useApiLogs";
import { useClientIntegrationConfigs } from "@/hooks/useClientIntegrationConfigs";
import { useInvoices } from "@/hooks/useInvoices";
import { useCampaignScripts } from "@/hooks/useCampaignScripts";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { IntegrationConfigs } from "@/types/integrations";
import type { CrmType, TenantStatus, NotificationTriggers } from "@/types/database";
import {
  ArrowLeft,
  Activity,
  AlertCircle,
  Link2,
  Map,
  Workflow,
  ExternalLink,
  Building2,
  TestTube,
  FileText,
  Receipt,
  Route,
  Scale,
  PhoneCall,
  ChevronRight,
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
  const { data: stats } = useApiLogStats();
  const { configs, saveConfigs, isSaving } = useClientIntegrationConfigs(id || "");
  const updateTenant = useUpdateTenant();
  const { data: allInvoices = [] } = useInvoices();
  const { data: campaignScripts = [] } = useCampaignScripts();

  const clientInvoices = allInvoices.filter((inv: any) => inv.tenant_id === id);
  const clientScripts = campaignScripts.filter((cs: any) => cs.tenant_id === id);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={tenant.name}
        subtitle={tenant.id}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 border border-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        }
        breadcrumb={
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-muted-foreground gap-1.5 -ml-2 h-7">
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
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title="API Calls (24h)"
          value={stats?.total || 0}
          subtitle={`${stats?.successRate || 100}% success rate`}
          icon={Activity}
          variant="default"
        />
        <PremiumStatCard
          title="Errors (24h)"
          value={stats?.errors || 0}
          subtitle="Requires attention"
          icon={AlertCircle}
          variant={stats?.errors ? "destructive" : "default"}
        />
        <PremiumStatCard
          title="CRM Connection"
          value={
            (configs?.clio?.enabled ? "Clio" : "") ||
            (configs?.mycase?.enabled ? "MyCase" : "") ||
            "None"
          }
          subtitle={
            configs?.clio?.oauthTokenId || configs?.mycase?.apiKeyId
              ? "Connected"
              : "Not connected"
          }
          icon={Link2}
          variant={configs?.clio?.oauthTokenId || configs?.mycase?.apiKeyId ? "success" : "warning"}
        />
        <PremiumStatCard
          title="Script Mappings"
          value={clientScripts.length}
          subtitle="DNIS/campaign routes"
          icon={Route}
          variant="primary"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="legal-connect">Legal Connect</TabsTrigger>
          <TabsTrigger value="five9-scripts">Five9 & Scripts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Layered setup entry cards — clear separation between client provider setup and campaign config */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="border-border cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/admin/clients/${tenant.id}/legal-connect`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Scale className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">Legal Connect</CardTitle>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-xs pt-1">
                  Provider connections, OAuth, webhooks, field mappings, policies
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="border-border cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/admin/clients/${tenant.id}/five9-overlay`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <PhoneCall className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">Five9 Overlay (Campaigns)</CardTitle>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-xs pt-1">
                  Campaign routing, call variables, dispositions, simulation
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Behavior & Mappings */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Field Mappings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/admin/mappings">
                      <Map className="h-4 w-4 mr-2" /> Open Mapping Builder
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Workflow Automations</CardTitle>
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
            </div>

            {/* Activity & Quick Actions */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">Recent API Logs</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/logs?tenant=${tenant.id}`}>
                        View All <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
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

              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/admin/test">
                      <TestTube className="h-4 w-4 mr-2" /> Open Test Console
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to={`/admin/logs?tenant=${tenant.id}`}>
                      <FileText className="h-4 w-4 mr-2" /> Open API Logs
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Legal Connect Tab */}
        <TabsContent value="legal-connect" className="space-y-4 mt-4">
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
                <CardTitle className="text-base">Webhook Destinations</CardTitle>
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
        </TabsContent>

        {/* Five9 & Scripts Tab */}
        <TabsContent value="five9-scripts" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">DNIS / Campaign → Script Mappings</h2>
            <Button size="sm" onClick={() => navigate("/admin/script-routing")}>
              Manage All Routes
            </Button>
          </div>
          {clientScripts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No script mappings for this client yet.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/admin/script-routing")}>
                  Add Script Mapping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DNIS</TableHead>
                    <TableHead>Campaign ID</TableHead>
                    <TableHead>Script ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientScripts.map((cs: any) => (
                    <TableRow key={cs.id}>
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
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card className="border-border">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Reports filtered to this client are available on the main Reports page.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/admin/reports")}>
                Open Reports
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          {clientInvoices.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No invoices for this client yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvoices.map((inv: any) => (
                    <TableRow key={inv.id}>
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
