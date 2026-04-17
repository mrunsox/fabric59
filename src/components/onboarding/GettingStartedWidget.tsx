import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Circle, Rocket, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

const DISMISS_KEY = "fabric59_getting_started_dismissed";

export function GettingStartedWidget() {
  const { organization } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || dismissed) {
      setLoading(false);
      return;
    }
    let active = true;

    Promise.all([
      supabase.from("five9_domains").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("agents").select("id", { count: "exact", head: true }),
      supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    ]).then(([d, t, a, m]) => {
      if (!active) return;
      setItems([
        { key: "domain", label: "Connect a Five9 domain", href: "/admin/domains", done: (d.count ?? 0) > 0 },
        { key: "tenant", label: "Add your first client", href: "/admin", done: (t.count ?? 0) > 0 },
        { key: "agent", label: "Provision an agent", href: "/admin/agents", done: (a.count ?? 0) > 0 },
        { key: "team", label: "Invite a team member", href: "/admin/settings", done: (m.count ?? 0) > 1 },
      ]);
      setLoading(false);
    });

    return () => { active = false; };
  }, [organization?.id, dismissed]);

  if (dismissed) return null;
  if (loading) return null;

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (completed === total) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription className="text-xs">
              {completed} of {total} completed ({pct}%)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.href}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors group"
              >
                {item.done ? (
                  <div className="h-5 w-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
                <span className={item.done ? "text-sm text-muted-foreground line-through" : "text-sm text-foreground"}>
                  {item.label}
                </span>
                {!item.done && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto group-hover:text-primary" />}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
