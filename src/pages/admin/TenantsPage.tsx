import { useState } from "react";
import { useTenants, useDeleteTenant } from "@/hooks/useTenants";
import { useApiLogStats } from "@/hooks/useApiLogs";
import { useFive9Sync } from "@/hooks/useFive9Sync";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { format } from "date-fns";

const crmLabels: Record<CrmType, string> = {
  clio: "Clio",
  workiz: "Workiz",
  salesforce: "Salesforce",
  generic_rest: "Generic REST",
  other: "Other",
};

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = useTenants();
  const { data: stats } = useApiLogStats();
  const deleteTenant = useDeleteTenant();
  const { syncFromFive9, isSyncing } = useFive9Sync();
  const { organization } = useAuth();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.crm_type.toLowerCase().includes(search.toLowerCase())
  );

  const activeTenants = tenants.filter((t) => t.status === "active").length;

  const columns = [
    {
      key: "name",
      header: "Client Name",
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{tenant.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {tenant.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "crm_type",
      header: "CRM",
      render: (tenant: Tenant) => (
        <StatusBadge variant={tenant.crm_type as CrmType}>
          {crmLabels[tenant.crm_type]}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (tenant: Tenant) => (
        <StatusBadge variant={tenant.status as TenantStatus} dot>
          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "crm_api_url",
      header: "API Endpoint",
      render: (tenant: Tenant) => (
        <span className="text-sm text-muted-foreground font-mono">
          {tenant.crm_api_url ? new URL(tenant.crm_api_url).host : "—"}
        </span>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      render: (tenant: Tenant) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(tenant.updated_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (tenant: Tenant) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Test Connection">
            <Plug className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTenant(tenant);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingTenant(tenant);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
      <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">
            Manage client integrations across Clio, Workiz, and other CRMs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncFromFive9(organization?.id)}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync from Five9'}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>
                Add a new client integration. Configure CRM connection details.
              </DialogDescription>
            </DialogHeader>
            <TenantForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={tenants.length}
          subtitle="Across all CRMs"
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="Active Clients"
          value={activeTenants}
          subtitle="Currently integrated"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="API Calls (24h)"
          value={stats?.total || 0}
          subtitle={`${stats?.successRate || 100}% success rate`}
          icon={Activity}
          variant="default"
        />
        <StatCard
          title="Errors (24h)"
          value={stats?.errors || 0}
          subtitle="Requires attention"
          icon={AlertCircle}
          variant={stats?.errors ? "destructive" : "default"}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredTenants}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyMessage="No clients found. Create your first client to get started."
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent className="sm:max-w-[500px]">
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
