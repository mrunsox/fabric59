import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTenants, useDeleteTenant } from "@/hooks/useTenants";
import { usePartners } from "@/hooks/usePartners";
import { useApiLogStats } from "@/hooks/useApiLogs";
import { useFive9Sync } from "@/hooks/useFive9Sync";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumTable } from "@/components/ui/premium-table";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ActionBanner } from "@/components/ui/action-banner";
import { MetricStrip } from "@/components/ui/metric-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TenantForm } from "@/components/tenants/TenantForm";
import type { Tenant, CrmType, TenantStatus } from "@/types/database";
import {
  Building2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Plug,
  ExternalLink,
  Download,
  AlertTriangle,
  Handshake,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const crmLabels: Record<CrmType, string> = {
  clio: "Clio",
  workiz: "Workiz",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  zendesk: "Zendesk",
  generic_rest: "Generic REST",
  other: "Other",
};

const INTEGRATION_ICONS: { field: keyof Tenant; id: string; label: string; logo: string }[] = [
  { field: "slack_webhook_url", id: "slack", label: "Slack", logo: "/integration-logos/slack.svg" },
  { field: "zapier_webhook_url", id: "zapier", label: "Zapier", logo: "/integration-logos/zapier.svg" },
  { field: "make_webhook_url", id: "make", label: "Make", logo: "/integration-logos/make.svg" },
  { field: "n8n_webhook_url", id: "n8n", label: "n8n", logo: "" },
  { field: "pabbly_webhook_url", id: "pabbly", label: "Pabbly", logo: "" },
];

const CRM_LOGOS: Record<string, string> = {
  clio: "/integration-logos/clio.svg",
  workiz: "/integration-logos/workiz.svg",
  salesforce: "/integration-logos/salesforce.svg",
};

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = useTenants();
  const { data: partners = [] } = usePartners();
  const { data: stats } = useApiLogStats();
  const deleteTenant = useDeleteTenant();
  const { syncFromFive9, isSyncing } = useFive9Sync();
  const { organization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [crmFilter, setCrmFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [attentionDismissed, setAttentionDismissed] = useState(false);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && tenants.length > 0) {
      const tenant = tenants.find((t) => t.id === editId);
      if (tenant) {
        setEditingTenant(tenant);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tenants, setSearchParams]);

  const filteredTenants = tenants
    .filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.crm_type.toLowerCase().includes(search.toLowerCase())
    )
    .filter((t) => {
      if (partnerFilter === "all") return true;
      if (partnerFilter === "direct") return !t.partner_id;
      return t.partner_id === partnerFilter;
    })
    .filter((t) => {
      if (crmFilter === "all") return true;
      return t.crm_type === crmFilter;
    })
    .filter((t) => {
      if (statusFilter === "all") return true;
      return t.status === statusFilter;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const inactiveTenants = tenants.filter((t) => t.status === "inactive").length;
  const errorCount = stats?.errors || 0;
  const hasIssues = errorCount > 0 || inactiveTenants > 0;

  // CRM breakdown
  const crmCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.crm_type] = (acc[t.crm_type] || 0) + 1;
    return acc;
  }, {});

  const uniquePartners = new Set(tenants.map((t) => t.partner_id).filter(Boolean)).size;
  const uniqueCrms = Object.keys(crmCounts);

  const hasActiveFilters = search || partnerFilter !== "all" || crmFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setPartnerFilter("all");
    setCrmFilter("all");
    setStatusFilter("all");
  };

  const columns = [
    {
      key: "name",
      header: "Client",
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 border border-primary/10">
            <span className="text-xs font-bold text-primary">
              {tenant.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{tenant.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {tenant.id.slice(0, 8)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "partner",
      header: "Partner",
      render: (tenant: Tenant) => {
        const partner = partners.find((p) => p.id === tenant.partner_id);
        return partner ? (
          <span className="text-sm text-foreground">{partner.name}</span>
        ) : (
          <span className="text-xs text-muted-foreground/60">Direct</span>
        );
      },
    },
    {
      key: "crm_type",
      header: "CRM",
      render: (tenant: Tenant) => (
        <StatusBadge variant={tenant.crm_type as CrmType} size="sm">
          {crmLabels[tenant.crm_type]}
        </StatusBadge>
      ),
    },
    {
      key: "health",
      header: "Health",
      render: (tenant: Tenant) => (
        <HealthIndicator
          status={tenant.status === "active" ? "healthy" : tenant.status === "pending_verification" ? "pending" : "offline"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (tenant: Tenant) => (
        <StatusBadge variant={tenant.status as TenantStatus} dot size="sm">
          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1).replace("_", " ")}
        </StatusBadge>
      ),
    },
    {
      key: "integrations",
      header: "Integrations",
      render: (tenant: Tenant) => {
        const badges: { label: string; logo: string }[] = [];
        if (tenant.crm_type && tenant.crm_type !== "other" && tenant.crm_type !== "generic_rest") {
          badges.push({ label: crmLabels[tenant.crm_type], logo: CRM_LOGOS[tenant.crm_type] || "" });
        }
        for (const int of INTEGRATION_ICONS) {
          if (tenant[int.field]) {
            badges.push({ label: int.label, logo: int.logo });
          }
        }
        if (badges.length === 0) return <span className="text-muted-foreground/40">—</span>;
        return (
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {badges.slice(0, 4).map((b) => (
                <Tooltip key={b.label}>
                  <TooltipTrigger asChild>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                      {b.logo ? (
                        <img src={b.logo} alt={b.label} className="h-3.5 w-3.5 object-contain dark:invert" />
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground">{b.label.slice(0, 2)}</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{b.label}</TooltipContent>
                </Tooltip>
              ))}
              {badges.length > 4 && (
                <span className="text-[10px] text-muted-foreground ml-1">+{badges.length - 4}</span>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
    {
      key: "updated_at",
      header: "Last Activity",
      render: (tenant: Tenant) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(tenant.updated_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[120px]",
      render: (tenant: Tenant) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Open"
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${tenant.id}`); }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Test Connection"
          >
            <Plug className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setEditingTenant(tenant); }}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeletingTenant(tenant); }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filterBar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-background border-border/60"
        />
      </div>
      <select
        value={partnerFilter}
        onChange={(e) => setPartnerFilter(e.target.value)}
        className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="all">All Partners</option>
        <option value="direct">Direct (no partner)</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select
        value={crmFilter}
        onChange={(e) => setCrmFilter(e.target.value)}
        className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="all">All CRMs</option>
        {uniqueCrms.map((crm) => (
          <option key={crm} value={crm}>{crmLabels[crm as CrmType] || crm}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending_verification">Pending</option>
      </select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground h-9">
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <PageHeader
        title="Clients"
        subtitle={`${tenants.length} client integrations across ${uniqueCrms.length} CRM systems`}
        icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 border border-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>}
      >
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Download className="h-4 w-4 mr-1.5" /> Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncFromFive9(organization?.id)}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync from Five9'}
        </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>
                Add a new client integration. Configure CRM connection details.
              </DialogDescription>
            </DialogHeader>
            <TenantForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Hero Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title="Integration Health"
          value={`${activeTenants}/${tenants.length}`}
          subtitle={`${tenants.length > 0 ? Math.round((activeTenants / tenants.length) * 100) : 0}% active`}
          icon={CheckCircle2}
          tier="hero"
          variant="success"
          trend={tenants.length > 0 ? { value: Math.round((activeTenants / tenants.length) * 100) - 80, label: "vs target" } : undefined}
        />
        <PremiumStatCard
          title="Active Clients"
          value={activeTenants}
          subtitle="Currently integrated"
          icon={Building2}
          variant="primary"
        />
        <PremiumStatCard
          title="API Calls (24h)"
          value={stats?.total || 0}
          subtitle={`${stats?.successRate || 100}% success rate`}
          icon={Activity}
          variant="default"
        />
        <PremiumStatCard
          title="Errors (24h)"
          value={errorCount}
          subtitle={errorCount > 0 ? "Requires attention" : "All clear"}
          icon={AlertCircle}
          variant={errorCount > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Metric Strip */}
      <MetricStrip
        items={[
          { label: "Partners", value: uniquePartners, icon: Handshake },
          ...Object.entries(crmCounts).slice(0, 4).map(([crm, count]) => ({
            label: crmLabels[crm as CrmType] || crm,
            value: count,
          })),
          { label: "Sync Volume", value: stats?.total || 0, icon: Zap },
        ]}
      />

      {/* Attention Banner */}
      {hasIssues && !attentionDismissed && (
        <ActionBanner
          icon={AlertTriangle}
          variant="warning"
          title={`${inactiveTenants > 0 ? `${inactiveTenants} inactive client${inactiveTenants > 1 ? 's' : ''}` : ''}${inactiveTenants > 0 && errorCount > 0 ? ' · ' : ''}${errorCount > 0 ? `${errorCount} API error${errorCount > 1 ? 's' : ''} in 24h` : ''}`}
          description="Review clients needing attention to ensure integration health."
          action={{
            label: "View Issues",
            onClick: () => { setStatusFilter("inactive"); },
          }}
          onDismiss={() => setAttentionDismissed(true)}
        />
      )}

      {/* Premium Table */}
      <PremiumTable
        columns={columns}
        data={filteredTenants}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        onRowClick={(t) => navigate(`/admin/clients/${t.id}`)}
        filterBar={filterBar}
        emptyIcon={Building2}
        emptyTitle="No clients found"
        emptyDescription={hasActiveFilters ? "Try adjusting your filters to find what you're looking for." : "Create your first client integration to get started."}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client configuration and CRM connection details.
            </DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <TenantForm
              tenant={editingTenant}
              onSuccess={() => setEditingTenant(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTenant}
        onOpenChange={() => setDeletingTenant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTenant?.name}"? This will
              remove all associated field mappings and API logs. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingTenant) {
                  deleteTenant.mutate(deletingTenant.id);
                  setDeletingTenant(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
