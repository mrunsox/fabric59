import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, Plus } from "lucide-react";
import { toast } from "sonner";

export default function FlowsPage() {
  const { organization, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: flows = [] } = useQuery({
    queryKey: ["flows", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("id, name, trigger_type, status, version, updated_at")
        .eq("organization_id", organization!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .insert({
          organization_id: organization!.id,
          name: "Untitled flow",
          trigger_type: "call_end",
          definition: { trigger: { type: "call_end" }, filters: [], mappings: [], action: null, failure: { retries: 0 } },
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (flow) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      navigate(`/admin/flows/${flow.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Flows</h1>
            <p className="text-sm text-muted-foreground mt-1">Five9-triggered automations to your connectors</p>
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-4 w-4 mr-2" /> New flow
        </Button>
      </div>

      {flows.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No flows yet. Create one to start automating Five9 events.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {flows.map((f) => (
            <Card key={f.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/admin/flows/${f.id}`)}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{f.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Trigger: {f.trigger_type} · v{f.version}</p>
                </div>
                <Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
