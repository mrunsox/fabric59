import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Webhook, RefreshCw, Bell, Inbox, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const TILES = [
  { title: "API Logs", description: "Real-time stream of every API request and response.", href: "/admin/logs", icon: FileText },
  { title: "Webhooks", description: "Inbound webhook activity, signatures, and failures.", href: "/admin/logs", icon: Webhook },
  { title: "Sync Jobs", description: "Background sync queue across providers and Five9.", href: "/admin/data-plane", icon: RefreshCw },
  { title: "Alerts", description: "Notification center for system and integration alerts.", href: "/admin/notifications", icon: Bell },
  { title: "Review Queue", description: "Items needing human review before they finalize.", href: "/admin/feedback", icon: Inbox },
  { title: "Event log", description: "Full Five9 event history with filters.", href: "/admin/campaigns/event-log", icon: Activity },
];

export default function MonitoringHubPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Monitoring"
        subtitle="Operational visibility across the entire platform"
        icon={<Activity className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.title} to={t.href}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">{t.title}</h3>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
