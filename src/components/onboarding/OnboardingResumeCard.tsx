import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Circle, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "fabric59:onboarding:dismissed";

type ChecklistItem = { label: string; done: boolean };

export function OnboardingResumeCard() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [incomplete, setIncomplete] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    if (!organization || dismissed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [orgRes, domainRes, tenantRes] = await Promise.all([
        supabase.from("organizations").select("five9_ownership_mode").eq("id", organization.id).maybeSingle(),
        supabase.from("five9_domains").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      ]);
      if (cancelled) return;
      const hasOwnership = !!orgRes.data?.five9_ownership_mode;
      const hasDomain = (domainRes.count ?? 0) > 0;
      const hasTenant = (tenantRes.count ?? 0) > 0;
      const next: ChecklistItem[] = [
        { label: "Five9 ownership mode", done: hasOwnership },
        { label: "Five9 domain connected", done: hasDomain },
        { label: "First client added", done: hasTenant },
        { label: "Ready to launch", done: hasOwnership && hasDomain && hasTenant },
      ];
      setItems(next);
      setIncomplete(!(hasOwnership && hasDomain && hasTenant));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organization, dismissed]);

  if (loading || dismissed || !incomplete) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Finish setting up Fabric59</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Pick up where you left off and get fully connected.</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 flex-shrink-0" onClick={handleDismiss} aria-label="Hide for now">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.label} className="flex items-center gap-2 text-sm">
                  {it.done ? (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                  )}
                  <span className={cn(it.done ? "text-foreground" : "text-muted-foreground")}>{it.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/onboarding")}>
                Resume setup
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Hide for now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
