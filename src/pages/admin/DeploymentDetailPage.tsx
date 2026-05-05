import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Dep {
  id: string;
  status: string;
  flow_id: string;
  client_id: string | null;
  five9_domain_id: string | null;
  campaign_name: string | null;
  trigger_type: string | null;
  template_type: string | null;
  scope: Record<string, unknown>;
}

export default function DeploymentDetailPage() {
  const { id } = useParams();
  const { organization } = useAuth();
  const [dep, setDep] = useState<Dep | null>(null);
  const [scopeText, setScopeText] = useState("{}");
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [domains, setDomains] = useState<Array<{ id: string; name: string }>>([]);
  const [flows, setFlows] = useState<Array<{ id: string; name: string; template_type: string | null; trigger_type: string }>>([]);

  useEffect(() => {
    if (!id || !organization) return;
    supabase.from("deployments").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) { setDep(data as unknown as Dep); setScopeText(JSON.stringify(data.scope, null, 2)); }
    });
    supabase.from("tenants").select("id, name").eq("organization_id", organization.id).then(({ data }) => setClients(data || []));
    supabase.from("five9_domains").select("id, display_name").eq("organization_id", organization.id).then(({ data }) => setDomains((data || []).map((d) => ({ id: d.id, name: d.display_name }))));
    supabase.from("flows").select("id, name, template_type, trigger_type").eq("organization_id", organization.id).then(({ data }) => setFlows(data || []));
  }, [id, organization]);

  const save = async () => {
    if (!dep) return;
    let scope: Record<string, unknown> = {};
    try { scope = JSON.parse(scopeText); } catch { toast.error("Invalid scope JSON"); return; }
    const { error } = await supabase.from("deployments").update({
      status: dep.status,
      client_id: dep.client_id,
      flow_id: dep.flow_id,
      five9_domain_id: dep.five9_domain_id,
      campaign_name: dep.campaign_name,
      trigger_type: dep.trigger_type,
      template_type: dep.template_type,
      scope: scope as never,
    }).eq("id", dep.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const onFlow = (flowId: string) => {
    const f = flows.find((x) => x.id === flowId);
    if (!dep) return;
    setDep({ ...dep, flow_id: flowId, template_type: f?.template_type ?? dep.template_type, trigger_type: f?.trigger_type ?? dep.trigger_type });
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
            <Select value={dep.flow_id} onValueChange={onFlow}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Select value={dep.client_id || "all"} onValueChange={(v) => setDep({ ...dep, client_id: v === "all" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Five9 domain</Label>
              <Select value={dep.five9_domain_id || "all"} onValueChange={(v) => setDep({ ...dep, five9_domain_id: v === "all" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All domains</SelectItem>
                  {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campaign</Label>
              <Input value={dep.campaign_name ?? ""} onChange={(e) => setDep({ ...dep, campaign_name: e.target.value || null })} placeholder="e.g. Intake - California" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={dep.status} onValueChange={(v) => setDep({ ...dep, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft", "testing", "active", "paused"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Advanced scope (JSON: queues, dispositions, variable expressions)</Label>
            <Textarea value={scopeText} onChange={(e) => setScopeText(e.target.value)} rows={6} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground mt-1">
              The fields above are queryable directly. Put complex multi-value or expression logic here.
            </p>
          </div>
          <Button onClick={save}>Save deployment</Button>
        </CardContent>
      </Card>
    </div>
  );
}
