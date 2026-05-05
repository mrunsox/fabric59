import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface DeploymentRow {
  id: string;
  status: string;
  created_at: string;
  flow_id: string;
  client_id: string | null;
  campaign_name: string | null;
  five9_domain_id: string | null;
  template_type: string | null;
  flows?: { name: string } | null;
  tenants?: { name: string } | null;
}

export default function DeploymentsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["deployments", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployments")
        .select("id, status, created_at, flow_id, client_id, campaign_name, five9_domain_id, template_type, flows(name), tenants(name)")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DeploymentRow[];
    },
    enabled: !!organization,
  });

  const { data: flows = [] } = useQuery({
    queryKey: ["flows-for-deploy", organization?.id],
    queryFn: async () => (await supabase.from("flows").select("id, name, template_type, trigger_type").eq("organization_id", organization!.id)).data || [],
    enabled: !!organization,
  });

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.client_id && r.tenants?.name) m.set(r.client_id, r.tenants.name); });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = rows.filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (clientFilter === "all" || r.client_id === clientFilter) &&
    (!campaignFilter || (r.campaign_name ?? "").toLowerCase().includes(campaignFilter.toLowerCase())) &&
    (!q || (r.flows?.name ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!flows.length) throw new Error("Create a flow first");
      const f = flows[0];
      const { data, error } = await supabase.from("deployments").insert({
        organization_id: organization!.id,
        flow_id: f.id,
        status: "draft",
        template_type: f.template_type,
        trigger_type: f.trigger_type,
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
            <p className="text-sm text-muted-foreground mt-1">Live flow assignments scoped to clients, domains, campaigns</p>
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}><Plus className="h-4 w-4 mr-2" />New</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by flow" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-[180px]" placeholder="Campaign" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "draft", "testing", "active", "paused"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No deployments match.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((d) => (
            <Card key={d.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/admin/deployments/${d.id}`)}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{d.flows?.name || "Flow"}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.tenants?.name || "All clients"}
                    {d.campaign_name ? ` · ${d.campaign_name}` : ""}
                    {d.template_type ? ` · ${d.template_type}` : ""}
                    {" · "}{new Date(d.created_at).toLocaleDateString()}
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
