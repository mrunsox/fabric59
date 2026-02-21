import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Globe, Plug, UserPlus, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { hasPermission, orgRole, isMasterAdmin } = useAuth();

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

    // Realtime subscriptions
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (showAgents) {
      const agentChannel = supabase
        .channel('dashboard-agents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
          fetchAgentData();
        })
        .subscribe();
      channels.push(agentChannel);
    }

    if (showClients) {
      const tenantChannel = supabase
        .channel('dashboard-tenants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
          fetchTenantData();
        })
        .subscribe();
      channels.push(tenantChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [showAgents, showClients, showDomains, showIntegrations, isFullAdmin]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "deprovisioned": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your personalized overview based on your access level.
        </p>
      </div>

      {/* Agent Stats */}
      {showAgents && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Agents</h2>
            <Button asChild size="sm">
              <Link to="/admin/agents">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Manage Agents
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Agents" value={agentStats.total} icon={Users} variant="primary" />
            <StatCard title="Active" value={agentStats.active} icon={Users} variant="success" />
            <StatCard title="Pending" value={agentStats.pending} icon={Users} variant="warning" />
            <StatCard title="Deprovisioned" value={agentStats.deprovisioned} icon={Users} variant="destructive" />
          </div>

          {recentAgents.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Recent Agents</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.first_name} {agent.last_name}</TableCell>
                      <TableCell className="text-muted-foreground">{agent.email}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(agent.status)}>{agent.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(agent.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {/* Client Stats */}
      {showClients && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Clients</h2>
            <Button asChild size="sm">
              <Link to="/admin">
                <Plus className="h-4 w-4 mr-1.5" />
                Manage Clients
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Clients" value={tenantStats.total} icon={Building2} variant="primary" />
            <StatCard title="Active" value={tenantStats.active} icon={Building2} variant="success" />
          </div>

          {recentTenants.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Recent Clients</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{tenant.crm_type}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(tenant.status)}>{tenant.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tenant.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {/* Admin-only summary cards */}
      {isFullAdmin && (showDomains || showIntegrations) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Platform Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showDomains && (
              <StatCard title="Five9 Domains" value={domainCount} icon={Globe} variant="default" />
            )}
            {showIntegrations && (
              <StatCard title="Active Integrations" value={integrationCount} icon={Plug} variant="default" />
            )}
          </div>
        </section>
      )}

      {!showAgents && !showClients && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No modules are assigned to your account yet. Contact your admin to get access.
          </p>
        </div>
      )}
    </div>
  );
}
