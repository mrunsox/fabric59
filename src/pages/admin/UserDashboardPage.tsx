import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ReadinessChecklist } from "@/components/dashboard/ReadinessChecklist";
import { AIGuidanceCard } from "@/components/dashboard/AIGuidanceCard";
import { QuickActionsGrid } from "@/components/dashboard/QuickActionsGrid";
import { SystemHealthStrip } from "@/components/dashboard/SystemHealthStrip";
import { fetchClientReadiness, type ClientReadiness } from "@/lib/readiness/computeCampaignReadiness";
import { Shield } from "lucide-react";

export default function UserDashboardPage() {
  const { organization } = useAuth();
  const [readiness, setReadiness] = useState<ClientReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    // Pick any tenant in the org as the "active" client for the dashboard view
    supabase.from("tenants").select("id").eq("organization_id", organization.id).limit(1).maybeSingle().then(async ({ data }) => {
      if (data?.id) {
        const r = await fetchClientReadiness(data.id);
        setReadiness(r);
      }
      setLoading(false);
    });
  }, [organization]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{organization?.name || "Command Center"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Setup readiness, AI guidance, and live operations at a glance</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReadinessChecklist readiness={readiness} loading={loading} title="Setup Progress" />
        <AIGuidanceCard readiness={readiness} />
      </div>

      <SystemHealthStrip organizationId={organization?.id} />

      <QuickActionsGrid />
    </div>
  );
}
