import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Workflow, Plus, Search } from "lucide-react";
import { listTemplatesSync } from "@/lib/flow-templates/adapter";

export default function FlowsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const templates = listTemplatesSync();
  const [q, setQ] = useState("");
  const [tplFilter, setTplFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: flows = [] } = useQuery({
    queryKey: ["flows", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("id, name, trigger_type, status, version, updated_at, template_type")
        .eq("organization_id", organization!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization,
  });

  const filtered = useMemo(() => flows.filter((f) => {
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (tplFilter !== "all" && f.template_type !== tplFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    return true;
  }), [flows, q, tplFilter, statusFilter]);

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
        <Button onClick={() => navigate("/admin/flows/new")}>
          <Plus className="h-4 w-4 mr-2" /> New flow
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search flows" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={tplFilter} onValueChange={setTplFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {["all", "draft", "testing", "active", "paused"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No flows match. Try a new template.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((f) => {
            const tpl = templates.find((t) => t.key === f.template_type);
            return (
              <Card key={f.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/admin/flows/${f.id}`)}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tpl ? `${tpl.name} · ` : ""}Trigger: {f.trigger_type} · v{f.version}
                    </p>
                  </div>
                  <Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

