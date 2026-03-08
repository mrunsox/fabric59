import { useParams, useNavigate, Link } from "react-router-dom";
import { usePartner } from "@/hooks/usePartners";
import { useTenants } from "@/hooks/useTenants";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import type { Tenant, CrmType, TenantStatus } from "@/types/database";
import { ArrowLeft, Building2, Users, Settings } from "lucide-react";
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

export default function PartnerOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: partner, isLoading } = usePartner(id || "");
  const { data: allTenants = [] } = useTenants();

  const partnerClients = allTenants.filter((t) => t.partner_id === id);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Partner not found.</p>
        <Button variant="outline" onClick={() => navigate("/admin/partners")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Partners
        </Button>
      </div>
    );
  }

  const activeClients = partnerClients.filter((c) => c.status === "active").length;

  const clientColumns = [
    {
      key: "name",
      header: "Client Name",
      render: (t: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{t.id.slice(0, 8)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: "crm_type",
      header: "CRM",
      render: (t: Tenant) => (
        <StatusBadge variant={t.crm_type as CrmType}>{crmLabels[t.crm_type]}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t: Tenant) => (
        <StatusBadge variant={t.status as TenantStatus} dot>
          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      render: (t: Tenant) => (
        <span className="text-sm text-muted-foreground">{format(new Date(t.updated_at), "MMM d, yyyy")}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/partners")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{partner.name}</h1>
            <StatusBadge variant={partner.status === "active" ? "active" : "inactive"} dot>
              {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
            </StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">slug: {partner.slug}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Clients" value={partnerClients.length} subtitle="Under this partner" icon={Users} variant="primary" />
        <StatCard title="Active Clients" value={activeClients} subtitle="Currently integrated" icon={Users} variant="success" />
        <StatCard title="Partner Defaults" value={Object.keys(partner.integration_configs || {}).length > 0 ? "Configured" : "None"} subtitle="Integration behavior defaults" icon={Settings} variant="default" />
      </div>

      {/* Partner-level defaults */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Partner-Level Integration Defaults</CardTitle>
          <CardDescription>
            These settings are inherited by all clients under this partner unless overridden at the client level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(partner.integration_configs || {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">No partner-level defaults configured. Clients will use org-level defaults.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(partner.integration_configs).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{key}</span>
                  <Badge variant="outline" className="font-mono text-xs">{typeof value === "object" ? "configured" : String(value)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Clients</h2>
          <Button size="sm" onClick={() => navigate("/admin")}>View All Clients</Button>
        </div>
        <DataTable
          columns={clientColumns}
          data={partnerClients}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => navigate(`/admin/clients/${t.id}`)}
          emptyMessage="No clients under this partner yet."
        />
      </div>
    </div>
  );
}
