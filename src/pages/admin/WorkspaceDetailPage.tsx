import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const { data: org } = useQuery({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status, five9_ownership_mode, billing_email")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["workspace-clients", id],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name, five9_ownership_mode").eq("organization_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  if (!org) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{org.billing_email}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Five9 ownership</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Badge>{org.five9_ownership_mode === "client" ? "Each client owns its own Five9" : "Workspace-owned shared Five9"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Clients ({clients.length})</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients in this workspace.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {clients.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <Badge variant="outline">{c.five9_ownership_mode || "inherits"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
