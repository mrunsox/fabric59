import { Link } from "react-router-dom";
import { Plus, Plug, FlaskConical, BookOpen, Play, type LucideIcon } from "lucide-react";

export function QuickActionsGrid({ clientId }: { clientId?: string } = {}) {
  // Canonical CTAs only — no compatibility-only or redirect targets.
  // /admin/campaigns/new = canonical campaign creation
  // /admin/connectors    = canonical org connector catalog
  // /admin/docs          = canonical docs hub
  // /admin/test          = ops test console (kept; operational tool)
  const actions: { title: string; href: string; icon: LucideIcon }[] = clientId
    ? [
        { title: "Create campaign", href: `/admin/campaigns/new?client=${clientId}`, icon: Plus },
        { title: "Connect provider", href: `/admin/clients/${clientId}/legal-connect`, icon: Plug },
        { title: "Run readiness test", href: `/admin/test?tenant=${clientId}`, icon: FlaskConical },
        { title: "Open docs", href: "/admin/docs", icon: BookOpen },
      ]
    : [
        { title: "Create campaign", href: "/admin/campaigns/new", icon: Plus },
        { title: "Connect provider", href: "/admin/connectors", icon: Plug },
        { title: "Run readiness test", href: "/admin/test", icon: FlaskConical },
        { title: "Open docs", href: "/admin/docs", icon: BookOpen },
      ];

  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick Actions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Jump straight into a setup task</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              to={a.href}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-background hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground leading-snug">{a.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
