import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Globe, FileText, Loader2 } from "lucide-react";

export default function MasterDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["master-stats"],
    queryFn: async () => {
      const [orgsRes, usersRes, domainsRes, tenantsRes] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("organization_members").select("user_id", { count: "exact", head: true }),
        supabase.from("five9_domains").select("id", { count: "exact", head: true }),
        supabase.from("tenants").select("id", { count: "exact", head: true }),
      ]);

      return {
        organizations: orgsRes.count || 0,
        users: usersRes.count || 0,
        domains: domainsRes.count || 0,
        tenants: tenantsRes.count || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Organizations", value: stats?.organizations || 0, icon: Building2 },
    { label: "Users", value: stats?.users || 0, icon: Users },
    { label: "Domains", value: stats?.domains || 0, icon: Globe },
    { label: "Tenants", value: stats?.tenants || 0, icon: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
