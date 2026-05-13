import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building, Building2, Plug, FileText, Settings, ArrowRight, Plus,
} from "lucide-react";

/**
 * Phase 3 — Canonical Org Overview at /org.
 *
 * Replaces the legacy admin OverviewPage (dashboard sprawl) with a clean
 * org command center: identity, real workspace count, and one primary
 * action plus a small set of approved secondary actions.
 *
 * Strict rule: only render data that already exists cleanly. No fake KPIs.
 */
export default function OrgOverviewPage() {
  const { organization } = useAuth();
  const { workspaces, isLoading } = useWorkspace();

  const { data: memberCount } = useQuery({
    queryKey: ["org-member-count", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", organization!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const defaultWorkspace = workspaces.find((w) => w.is_default) ?? workspaces[0] ?? null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground truncate">
              {organization?.name ?? "Organization"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Org-level command center. Manage workspaces, connectors, members, and reports.
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to="/org/workspaces">
            <Plus className="h-4 w-4 mr-1.5" />
            New workspace
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Workspaces"
          value={isLoading ? "—" : String(workspaces.length)}
          hint={defaultWorkspace ? `Default: ${defaultWorkspace.name}` : undefined}
        />
        <StatCard
          label="Members"
          value={memberCount === undefined ? "—" : String(memberCount)}
          hint="Across this organization"
        />
        <StatCard
          label="Plan"
          value={(organization as any)?.plan ?? "Standard"}
          hint={organization?.status ? `Status: ${organization.status}` : undefined}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <NavTile to="/org/workspaces" icon={Building} title="Workspaces" desc="Create and manage workspaces" />
          <NavTile to="/org/connectors" icon={Plug} title="Connectors" desc="Configure org-level integrations" />
          <NavTile to="/org/reports" icon={FileText} title="Reports" desc="Org-level reporting surfaces" />
          <NavTile to="/org/settings" icon={Settings} title="Settings" desc="Members, profile, and branding" />
        </CardContent>
      </Card>

      {defaultWorkspace && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jump into work</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{defaultWorkspace.name}</p>
              <p className="text-xs text-muted-foreground">Your default workspace</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/w/${defaultWorkspace.id}/home`}>
                Open workspace
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1 capitalize">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function NavTile({
  to, icon: Icon, title, desc,
}: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 hover:border-primary/40 hover:bg-accent/40 transition-colors"
    >
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
