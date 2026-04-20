import { Link } from "react-router-dom";
import { Plus, Plug, FlaskConical, BookOpen, Play, type LucideIcon } from "lucide-react";

const ACTIONS: { title: string; href: string; icon: LucideIcon }[] = [
  { title: "Create campaign", href: "/admin/five9/campaign-builder", icon: Plus },
  { title: "Connect provider", href: "/admin/legal-connect", icon: Plug },
  { title: "Run readiness test", href: "/admin/test", icon: FlaskConical },
  { title: "Open docs", href: "/admin/kb", icon: BookOpen },
  { title: "Start simulation", href: "/admin/test", icon: Play },
];

export function QuickActionsGrid() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick Actions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Jump straight into a setup task</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ACTIONS.map((a) => {
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
