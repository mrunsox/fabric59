import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  ArrowRight,
  FileText,
  BookOpen,
  Megaphone,
  Headphones,
  Layers,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/sections/DashboardHeader";


interface OrgRow {
  id: string;
  name: string;
  status: string | null;
  five9_ownership_mode: string | null;
}

interface DefaultWorkspaceRow {
  id: string;
  organization_id: string;
  is_default: boolean;
}

export default function WorkspacesPage() {
  const { data: orgs = [], isLoading } = useQuery<OrgRow[]>({
    queryKey: ["admin-workspaces-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status, five9_ownership_mode")
        .order("name");
      if (error) throw error;
      return (data || []) as OrgRow[];
    },
  });

  // Resolve each org's default workspace in a single round-trip so card
  // deep links land on the canonical /w/:workspaceId/* surfaces.
  const { data: workspaceMap } = useQuery<Record<string, string>>({
    queryKey: ["admin-workspaces-default-map", orgs.map((o) => o.id).join(",")],
    enabled: orgs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, organization_id, is_default")
        .in(
          "organization_id",
          orgs.map((o) => o.id),
        )
        .order("is_default", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const w of (data || []) as DefaultWorkspaceRow[]) {
        if (!map[w.organization_id]) map[w.organization_id] = w.id;
      }
      return map;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader
        icon={Layers}
        title="Workspaces"
        subtitle="Tenant boundary for the platform. Workspaces are backed by the organizations table; all flows, deployments, runs, and clients are scoped here."
        scope="organization"
      />


      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orgs.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No workspaces yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => {
            const wsId = workspaceMap?.[o.id];
            const base = wsId ? `/w/${wsId}` : null;
            return (
              <Card key={o.id} className="hover:border-primary/40 transition-colors h-full flex flex-col">
                <Link to={`/admin/workspaces/${o.id}`} className="block">
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate" title={o.name}>{o.name}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                </Link>
                <CardContent className="flex flex-col gap-3 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{o.status || "active"}</Badge>
                    <Badge variant="secondary">Five9: {o.five9_ownership_mode || "workspace"}-owned</Badge>
                  </div>
                  {base ? (
                    <>
                      <Button asChild size="sm" className="w-full gap-1.5">
                        <Link to={`${base}/campaigns`}>
                          Open workspace <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <div className="grid grid-cols-4 gap-1.5">
                        <DeepLink to={`${base}/forms`} icon={FileText} label="Forms" />
                        <DeepLink to={`${base}/guides`} icon={BookOpen} label="Guides" />
                        <DeepLink to={`${base}/campaigns`} icon={Megaphone} label="Campaigns" />
                        <DeepLink to={`${base}/agent`} icon={Headphones} label="Agent" />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No workspace provisioned</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeepLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      title={label}
      className="flex flex-col items-center justify-center gap-1 rounded-md border border-border/60 bg-muted/20 px-1.5 py-2 text-[10px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-primary/40 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate w-full text-center">{label}</span>
    </Link>
  );
}
