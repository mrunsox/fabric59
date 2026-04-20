import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Plug, BookOpen, Activity, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Five9DocsPanel } from "@/components/docs/Five9DocsPanel";

interface Stats { domains: number; activeRoutes: number; readyRoutes: number; blockedRoutes: number; events24h: number; }

export default function Five9OverviewPage() {
  const { organization } = useAuth();
  const [stats, setStats] = useState<Stats>({ domains: 0, activeRoutes: 0, readyRoutes: 0, blockedRoutes: 0, events24h: 0 });
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
    if (!organization) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from("five9_domains").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("five9_campaign_routes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_active", true),
      (supabase as any).from("v_campaign_readiness").select("status").eq("organization_id", organization.id),
      supabase.from("five9_event_log").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).gte("created_at", since),
    ]).then(([d, r, rd, e]: any) => {
      const rows = (rd.data || []) as { status: string }[];
      setStats({
        domains: d.count ?? 0,
        activeRoutes: r.count ?? 0,
        readyRoutes: rows.filter((x) => x.status === "ready").length,
        blockedRoutes: rows.filter((x) => x.status === "blocked").length,
        events24h: e.count ?? 0,
      });
    });
  }, [organization]);

  const tiles = [
    { label: "Domains", value: stats.domains, href: "/admin/domains" },
    { label: "Active routes", value: stats.activeRoutes, href: "/admin/campaigns" },
    { label: "Ready", value: stats.readyRoutes, href: "/admin/campaigns/readiness", tone: "success" },
    { label: "Blocked", value: stats.blockedRoutes, href: "/admin/campaigns/readiness", tone: "destructive" },
    { label: "Events (24h)", value: stats.events24h, href: "/admin/campaigns/event-log" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Five9"
        subtitle="Domains, campaigns, variables, dispositions — your call platform control center"
        icon={<Phone className="h-6 w-6 text-primary" />}
      >
        <Button asChild>
          <Link to="/admin/five9/campaign-builder"><Plus className="h-4 w-4 mr-1.5" />Create campaign</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/domains"><Plug className="h-4 w-4 mr-1.5" />Connect domain</Link>
        </Button>
        <Button variant="outline" onClick={() => setDocsOpen(true)}>
          <BookOpen className="h-4 w-4 mr-1.5" />Docs
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.href}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</p>
                <p className={`text-3xl font-semibold mt-2 ${
                  t.tone === "success" ? "text-success" : t.tone === "destructive" ? "text-destructive" : "text-foreground"
                }`}>{t.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Guidance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use the AI Guide drawer in any Five9 page for next-best-action recommendations based on your live setup state.</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/dashboard">Open Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Health</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Webhook intake</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">OK</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Last 24h events</span><span className="font-medium">{stats.events24h}</span></div>
            <Button variant="outline" size="sm" asChild className="w-full mt-2">
              <Link to="/admin/campaigns/event-log">View event log</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Five9DocsPanel open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  );
}
