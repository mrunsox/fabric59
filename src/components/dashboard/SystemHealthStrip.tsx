import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Webhook } from "lucide-react";

interface HealthSnapshot {
  recentEvents: number;
  failedEvents: number;
  activeAgents: number;
}

type Tone = "default" | "warning" | "success" | "muted";

export function SystemHealthStrip({ organizationId }: { organizationId?: string | null }) {
  const [snap, setSnap] = useState<HealthSnapshot>({ recentEvents: 0, failedEvents: 0, activeAgents: 0 });

  useEffect(() => {
    if (!organizationId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      supabase.from("five9_event_log").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", since),
      supabase.from("five9_event_log").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "failed").gte("created_at", since),
      // Scope agents to current org — was leaking platform-wide counts before.
      supabase.from("agents").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    ]).then(([events, failed, agents]) => {
      setSnap({
        recentEvents: events.count ?? 0,
        failedEvents: failed.count ?? 0,
        activeAgents: agents.count ?? 0,
      });
    });
  }, [organizationId]);

  // Derive webhook tone from actual event traffic — no hardcoded "OK".
  const webhook: { value: string; tone: Tone } =
    snap.failedEvents > 0
      ? { value: "Degraded", tone: "warning" }
      : snap.recentEvents > 0
      ? { value: "Healthy", tone: "success" }
      : { value: "No traffic", tone: "muted" };

  const items: { label: string; value: string | number; icon: typeof Activity; tone: Tone }[] = [
    { label: "Events (24h)", value: snap.recentEvents, icon: Activity, tone: "default" },
    { label: "Failed events", value: snap.failedEvents, icon: AlertTriangle, tone: snap.failedEvents > 0 ? "warning" : "default" },
    { label: "Webhook health", value: webhook.value, icon: Webhook, tone: webhook.tone },
    { label: "Active agents", value: snap.activeAgents, icon: CheckCircle2, tone: "default" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold tracking-tight text-foreground mb-4">System Health</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          const toneCls =
            it.tone === "warning"
              ? "text-warning"
              : it.tone === "success"
              ? "text-success"
              : it.tone === "muted"
              ? "text-muted-foreground"
              : "text-foreground";
          return (
            <div key={it.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Icon className={`h-4 w-4 ${toneCls}`} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <p className={`text-lg font-semibold truncate ${toneCls}`} title={String(it.value)}>{it.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
