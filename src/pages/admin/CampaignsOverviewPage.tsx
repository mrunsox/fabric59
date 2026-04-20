import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Plus, FileEdit, ListChecks, Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface Counts { active: number; drafts: number; ready: number; blocked: number; recentEvents: number; }

export default function CampaignsOverviewPage() {
  const { organization } = useAuth();
  const [counts, setCounts] = useState<Counts>({ active: 0, drafts: 0, ready: 0, blocked: 0, recentEvents: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!organization) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      supabase.from("five9_campaign_routes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_active", true),
      (supabase as any).from("campaign_builder_drafts").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).neq("status", "configured"),
      (supabase as any).from("v_campaign_readiness").select("status").eq("organization_id", organization.id),
      supabase.from("five9_event_log").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).gte("created_at", since),
      supabase.from("five9_event_log").select("id, event_type, status, created_at, campaign_name").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
    ]).then(([a, d, rd, e, recentRows]: any) => {
      const rows = (rd.data || []) as { status: string }[];
      setCounts({
        active: a.count ?? 0,
        drafts: d.count ?? 0,
        ready: rows.filter((x) => x.status === "ready").length,
        blocked: rows.filter((x) => x.status === "blocked").length,
        recentEvents: e.count ?? 0,
      });
      setRecent(recentRows.data || []);
    });
  }, [organization]);

  const tiles = [
    { label: "Active routes", value: counts.active, href: "/admin/campaigns", icon: Megaphone },
    { label: "Drafts", value: counts.drafts, href: "/admin/campaigns/drafts", icon: FileEdit },
    { label: "Ready", value: counts.ready, href: "/admin/campaigns/readiness", icon: ListChecks, tone: "success" as const },
    { label: "Blocked", value: counts.blocked, href: "/admin/campaigns/readiness", icon: ListChecks, tone: "destructive" as const },
    { label: "Events (24h)", value: counts.recentEvents, href: "/admin/campaigns/event-log", icon: Activity },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns"
        subtitle="Operational overview of every Five9 campaign across the platform"
        icon={<Megaphone className="h-6 w-6 text-primary" />}
      >
        <Button asChild>
          <Link to="/admin/five9/campaign-builder"><Plus className="h-4 w-4 mr-1.5" />New campaign</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.href}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</p>
                    <Icon className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <p className={`text-3xl font-semibold mt-2 ${
                    t.tone === "success" ? "text-success" : t.tone === "destructive" ? "text-destructive" : "text-foreground"
                  }`}>{t.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent events.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium truncate">{e.event_type}</span>
                    {e.campaign_name && <span className="text-xs text-muted-foreground truncate">{e.campaign_name}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs ${e.status === "failed" ? "text-destructive" : e.status === "success" ? "text-success" : "text-muted-foreground"}`}>{e.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild className="w-full mt-2">
                <Link to="/admin/campaigns/event-log">View full event log</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
