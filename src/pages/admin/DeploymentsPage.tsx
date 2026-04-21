import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Plus } from "lucide-react";
import { toast } from "sonner";

interface DeploymentRow {
  id: string;
  status: string;
  created_at: string;
  flow_id: string;
  client_id: string | null;
  flows?: { name: string } | null;
  tenants?: { name: string } | null;
}

export default function DeploymentsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["deployments", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployments")
        .select("id, status, created_at, flow_id, client_id, flows(name), tenants(name)")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DeploymentRow[];
    },
    enabled: !!organization,
  });

  const { data: flows = [] } = useQuery({
    queryKey: ["flows-for-deploy", organization?.id],
    queryFn: async () => (await supabase.from("flows").select("id, name").eq("organization_id", organization!.id)).data || [],
    enabled: !!organization,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!flows.length) throw new Error("Create a flow first");
      const { data, error } = await supabase.from("deployments").insert({
        organization_id: organization!.id, flow_id: flows[0].id, status: "draft",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["deployments"] }); navigate(`/admin/deployments/${d.id}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Deployments</h1>
            <p className="text-sm text-muted-foreground mt-1">Live flow assignments scoped to clients and dispositions</p>
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}><Plus className="h-4 w-4 mr-2" />New</Button>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No deployments yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((d) => (
            <Card key={d.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/admin/deployments/${d.id}`)}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{d.flows?.name || "Flow"}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Client: {d.tenants?.name || "All"} · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
