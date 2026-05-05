import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, ArrowRight } from "lucide-react";

export default function WorkspacesPage() {
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status, five9_ownership_mode")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tenant boundary for the platform. Workspaces are backed by the <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">organizations</code> table; all flows, deployments, runs, and clients are scoped here.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orgs.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No workspaces yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <Link key={o.id} to={`/admin/workspaces/${o.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{o.name}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Badge variant="outline">{o.status || "active"}</Badge>
                  <Badge variant="secondary">Five9: {o.five9_ownership_mode || "workspace"}-owned</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
