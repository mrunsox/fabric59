import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Activity, Repeat, AlertTriangle, Play } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const TILES = [
  { title: "Test Console", description: "Send synthetic Five9 events end-to-end and watch them flow through.", href: "/admin/test", icon: FlaskConical },
  { title: "Simulations", description: "Open a campaign overlay to run a full simulation against a configured route.", href: "/admin/campaigns", icon: Play },
  { title: "Replay", description: "Replay historic events for debugging or regression validation.", href: "/admin/logs", icon: Repeat },
  { title: "Failures", description: "Filter the event log for failed events to triage what's broken.", href: "/admin/campaigns/event-log", icon: AlertTriangle },
];

export default function TestingHubPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Testing"
        subtitle="Validate your setup before going live"
        icon={<FlaskConical className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-2">
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

      <Card>
        <CardContent className="p-6 flex items-start gap-4">
          <Activity className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">Readiness scoring is automatic</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Every campaign has a live readiness signal in the{" "}
              <Link to="/admin/campaigns/readiness" className="text-primary underline">readiness board</Link>{" "}
              — run a test against any campaign that's stuck in <em>blocked</em> or <em>test ready</em>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
