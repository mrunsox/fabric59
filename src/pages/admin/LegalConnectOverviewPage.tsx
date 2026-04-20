import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle2, AlertCircle, Webhook } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const PROVIDERS = [
  { key: "clio", label: "Clio" },
  { key: "mycase", label: "MyCase" },
  { key: "smokeball", label: "Smokeball" },
];

interface ProviderStat { connected: number; total: number; }

export default function LegalConnectOverviewPage() {
  const { organization } = useAuth();
  const [providerStats, setProviderStats] = useState<Record<string, ProviderStat>>({});
  const [recentFailures, setRecentFailures] = useState<any[]>([]);

  useEffect(() => {
    if (!organization) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    supabase.from("tenants").select("id, integration_configs").eq("organization_id", organization.id).then(({ data }: any) => {
      const stats: Record<string, ProviderStat> = {};
      for (const p of PROVIDERS) stats[p.key] = { connected: 0, total: data?.length || 0 };
      for (const t of data || []) {
        const cfg = t.integration_configs || {};
        for (const p of PROVIDERS) {
          if (cfg[p.key]?.connected || cfg[p.key]?.access_token || cfg[p.key]?.api_key) stats[p.key].connected++;
        }
      }
      setProviderStats(stats);
    });

    supabase.from("five9_event_log").select("id, created_at, event_type, error, resolved_provider").eq("organization_id", organization.id).eq("status", "failed").gte("created_at", since).order("created_at", { ascending: false }).limit(5).then(({ data }) => setRecentFailures(data || []));
  }, [organization]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Legal Connect"
        subtitle="Provider connections, webhooks, and sync health for Clio, MyCase, and Smokeball"
        icon={<Scale className="h-6 w-6 text-primary" />}
      >
        <Button asChild>
          <Link to="/admin/legal-connect">Manage connections</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        {PROVIDERS.map((p) => {
          const s = providerStats[p.key] || { connected: 0, total: 0 };
          const fullyConnected = s.connected > 0;
          return (
            <Card key={p.key} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{p.label}</h3>
                  {fullyConnected
                    ? <Badge className="bg-success/10 text-success border-success/30">Connected</Badge>
                    : <Badge variant="outline" className="bg-muted text-muted-foreground">Not connected</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{s.connected} of {s.total} clients connected</p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/admin/legal-connect">Configure</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" />Webhook Health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Inbound webhooks</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">OK</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Provider callbacks</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">OK</Badge></div>
            <Button variant="outline" size="sm" asChild className="w-full mt-3">
              <Link to="/admin/integrations">Open integrations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" />Recent sync failures</CardTitle></CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No failures in the last 7 days
              </div>
            ) : (
              <div className="space-y-2">
                {recentFailures.map((f) => (
                  <div key={f.id} className="text-xs p-2 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{f.event_type}</span>
                      <span className="text-muted-foreground">{new Date(f.created_at).toLocaleTimeString()}</span>
                    </div>
                    {f.error && <p className="text-muted-foreground mt-1 truncate">{f.error}</p>}
                  </div>
                ))}
                <Button variant="outline" size="sm" asChild className="w-full mt-2">
                  <Link to="/admin/campaigns/event-log">View all events</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
