import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Sparkles, ShieldAlert, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/sections/DashboardHeader";


type Stat = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  unavailable?: boolean;
};

/**
 * Platform Overview — superadmin landing surface.
 *
 * Canonical role: cross-tenant governance snapshot. Metrics are
 * data-honest: any value we cannot cleanly aggregate at platform
 * scope is rendered as a neutral "—" with an "Unavailable" caption
 * rather than a fabricated number.
 */
export default function SuperadminOverviewPage() {
  const [orgs, setOrgs] = useState<number | null>(null);
  const [users, setUsers] = useState<number | null>(null);
  const [partners, setPartners] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ count: orgCount }, { count: userCount }, { count: partnerCount }] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_design_partner", true),
      ]);
      setOrgs(orgCount ?? 0);
      setUsers(userCount ?? 0);
      setPartners(partnerCount ?? 0);
    })();
  }, []);

  // Legal Connect alerts are scoped per-tenant in this build; we do not
  // have a clean platform-wide aggregation surface yet. Render as
  // explicitly unavailable rather than mislead with a zero.
  const stats: Stat[] = [
    { label: "Active organizations", value: orgs ?? "—", icon: Building2 },
    { label: "Users", value: users ?? "—", icon: Users },
    { label: "Design partners", value: partners ?? "—", icon: Sparkles },
    { label: "Legal Connect alerts", value: "—", icon: ShieldAlert, unavailable: true },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        icon={Globe2}
        title="Platform Overview"
        subtitle="Cross-tenant governance, platform health, and superadmin operations."
        scope="platform"
      />


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                    {s.unavailable && (
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        Unavailable at platform scope
                      </p>
                    )}
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/workspaces">Organizations</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/users">Users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/design-partners">Design Partners</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/legal-connect-reports">Legal Connect Reports</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/docs">System Docs</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/asc-shadow">ASC Shadow Observation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
