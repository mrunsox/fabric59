import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Globe, Plug, UserPlus, Plus, Activity, AlertTriangle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { PremiumTable } from "@/components/ui/premium-table";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AgentStats {
  total: number;
  active: number;
  pending: number;
  deprovisioned: number;
}

interface TenantStats {
  total: number;
  active: number;
}

interface RecentAgent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
}

interface RecentTenant {
  id: string;
  name: string;
  status: string;
  crm_type: string;
  created_at: string;
}

export default function UserDashboardPage() {
  const { hasPermission, orgRole, isMasterAdmin, organization } = useAuth();

  const showAgents = hasPermission("agents");
  const showClients = hasPermission("tenants");
  const showDomains = hasPermission("domains");
  const showIntegrations = hasPermission("integrations");
  const isFullAdmin = orgRole === "owner" || orgRole === "admin" || isMasterAdmin;

  const [agentStats, setAgentStats] = useState<AgentStats>({ total: 0, active: 0, pending: 0, deprovisioned: 0 });
  const [tenantStats, setTenantStats] = useState<TenantStats>({ total: 0, active: 0 });
  const [recentAgents, setRecentAgents] = useState<RecentAgent[]>([]);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [domainCount, setDomainCount] = useState(0);
  const [integrationCount, setIntegrationCount] = useState(0);

  const fetchAgentData = () => {
    supabase.from("agents").select("id, status").then(({ data }) => {
      if (data) {
        setAgentStats({
          total: data.length,
          active: data.filter((a) => a.status === "active").length,
          pending: data.filter((a) => a.status === "pending").length,
          deprovisioned: data.filter((a) => a.status === "deprovisioned").length,
        });
      }
    });
    supabase
      .from("agents")
      .select("id, first_name, last_name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecentAgents(data);
      });
  };

  const fetchTenantData = () => {
    supabase.from("tenants").select("id, status").then(({ data }) => {
      if (data) {
        setTenantStats({
          total: data.length,
          active: data.filter((t) => t.status === "active").length,
        });
      }
    });
    supabase
      .from("tenants")
      .select("id, name, status, crm_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecentTenants(data);
      });
  };

  useEffect(() => {
    if (showAgents) fetchAgentData();
    if (showClients) fetchTenantData();

    if (isFullAdmin && showDomains) {
      supabase.from("five9_domains").select("id", { count: "exact", head: true }).then(({ count }) => {
        setDomainCount(count ?? 0);
      });
    }

    if (isFullAdmin && showIntegrations) {
      supabase.from("tenants").select("id", { count: "exact", head: true }).then(({ count }) => {
        setIntegrationCount(count ?? 0);
      });
    }

    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (showAgents) {
      const agentChannel = supabase
        .channel('dashboard-agents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => fetchAgentData())
        .subscribe();
      channels.push(agentChannel);
    }

    if (showClients) {
      const tenantChannel = supabase
        .channel('dashboard-tenants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => fetchTenantData())
        .subscribe();
      channels.push(tenantChannel);
    }

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [showAgents, showClients, showDomains, showIntegrations, isFullAdmin]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "deprovisioned": return "destructive";
      default: return "outline";
    }
  };

  const agentColumns = [
    {
      key: "name",
      header: "Name",
      render: (a: RecentAgent) => (
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
            {a.first_name[0]}{a.last_name[0]}
          </div>
          <span className="font-medium text-foreground">{a.first_name} {a.last_name}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (a: RecentAgent) => <span className="text-muted-foreground text-sm">{a.email}</span> },
    { key: "status", header: "Status", render: (a: RecentAgent) => <Badge variant={statusVariant(a.status)}>{a.status}</Badge> },
    { key: "added", header: "Added", render: (a: RecentAgent) => <span className="text-muted-foreground text-sm">{format(new Date(a.created_at), "MMM d, yyyy")}</span> },
  ];

  const tenantColumns = [
    { key: "name", header: "Name", render: (t: RecentTenant) => <span className="font-medium text-foreground">{t.name}</span> },
    { key: "crm", header: "CRM", render: (t: RecentTenant) => <span className="text-muted-foreground capitalize text-sm">{t.crm_type}</span> },
    { key: "status", header: "Status", render: (t: RecentTenant) => <Badge variant={statusVariant(t.status)}>{t.status}</Badge> },
    { key: "added", header: "Added", render: (t: RecentTenant) => <span className="text-muted-foreground text-sm">{format(new Date(t.created_at), "MMM d, yyyy")}</span> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={organization?.name || "My Dashboard"}
        subtitle="Your personalized command center — monitor agents, clients, and platform health."
        icon={<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="h-5 w-5 text-primary" /></div>}
      >
        <HealthIndicator status="healthy" />
      </PageHeader>

      {/* Hero + Secondary Metrics */}
      {(showAgents || showClients) && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {showAgents && (
            <PremiumStatCard
              title="Integration Health"
              value={`${agentStats.active + tenantStats.active}`}
              subtitle="Active agents & clients combined"
              icon={Activity}
              tier="hero"
              variant="primary"
            />
          )}
          {showAgents && (
            <PremiumStatCard title="Active Agents" value={agentStats.active} subtitle={`${agentStats.pending} pending`} icon={Users} variant="success" />
          )}
          {showClients && (
            <PremiumStatCard title="Active Clients" value={tenantStats.active} subtitle={`${tenantStats.total} total`} icon={Building2} variant="primary" />
          )}
        </div>
      )}

      {/* Platform overview for admins */}
      {isFullAdmin && (showDomains || showIntegrations) && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {showDomains && (
            <PremiumStatCard title="Five9 Domains" value={domainCount} icon={Globe} tier="compact" variant="default" />
          )}
          {showIntegrations && (
            <PremiumStatCard title="Active Integrations" value={integrationCount} icon={Plug} tier="compact" variant="default" />
          )}
          {showAgents && agentStats.pending > 0 && (
            <PremiumStatCard title="Needs Attention" value={agentStats.pending} subtitle="Agents pending setup" icon={AlertTriangle} tier="compact" variant="warning" />
          )}
        </div>
      )}

      {/* Recent Agents */}
      {showAgents && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Agents</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/agents">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Manage Agents
              </Link>
            </Button>
          </div>
          <PremiumTable
            columns={agentColumns}
            data={recentAgents}
            keyExtractor={(a) => a.id}
            emptyIcon={Users}
            emptyTitle="No agents yet"
            emptyDescription="Onboard your first agent to get started."
          />
        </section>
      )}

      {/* Recent Clients */}
      {showClients && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Clients</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Manage Clients
              </Link>
            </Button>
          </div>
          <PremiumTable
            columns={tenantColumns}
            data={recentTenants}
            keyExtractor={(t) => t.id}
            emptyIcon={Building2}
            emptyTitle="No clients yet"
            emptyDescription="Add your first client to begin integrating."
          />
        </section>
      )}

      {!showAgents && !showClients && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <p className="text-muted-foreground">
            No modules are assigned to your account yet. Contact your admin to get access.
          </p>
        </div>
      )}
    </div>
  );
}
