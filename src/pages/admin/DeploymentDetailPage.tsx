import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function DeploymentDetailPage() {
  const { id } = useParams();
  const { organization } = useAuth();
  const [dep, setDep] = useState<{ id: string; status: string; flow_id: string; client_id: string | null; scope: Record<string, unknown> } | null>(null);
  const [scopeText, setScopeText] = useState("{}");
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [flows, setFlows] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!id || !organization) return;
    supabase.from("deployments").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) { setDep(data as typeof dep); setScopeText(JSON.stringify(data.scope, null, 2)); }
    });
    supabase.from("tenants").select("id, name").eq("organization_id", organization.id).then(({ data }) => setClients(data || []));
    supabase.from("flows").select("id, name").eq("organization_id", organization.id).then(({ data }) => setFlows(data || []));
  }, [id, organization]);

  const save = async () => {
    if (!dep) return;
    let scope: Record<string, unknown> = {};
    try { scope = JSON.parse(scopeText); } catch { toast.error("Invalid scope JSON"); return; }
    const { error } = await supabase.from("deployments").update({
      status: dep.status, client_id: dep.client_id, flow_id: dep.flow_id, scope,
    }).eq("id", dep.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (!dep) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Deployment</h1>
        <Badge variant={dep.status === "active" ? "default" : "secondary"}>{dep.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Flow</Label>
            <Select value={dep.flow_id} onValueChange={(v) => setDep({ ...dep, flow_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Client (leave empty to apply to all)</Label>
            <Select value={dep.client_id || "all"} onValueChange={(v) => setDep({ ...dep, client_id: v === "all" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={dep.status} onValueChange={(v) => setDep({ ...dep, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope (JSON: campaign / queue / disposition / variable filters)</Label>
            <Textarea value={scopeText} onChange={(e) => setScopeText(e.target.value)} rows={6} className="font-mono text-xs" />
          </div>
          <Button onClick={save}>Save deployment</Button>
        </CardContent>
      </Card>
    </div>
  );
}
