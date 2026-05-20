import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ReadinessChecklist } from "@/components/dashboard/ReadinessChecklist";
import { AIGuidanceCard } from "@/components/dashboard/AIGuidanceCard";
import { QuickActionsGrid } from "@/components/dashboard/QuickActionsGrid";
import { SystemHealthStrip } from "@/components/dashboard/SystemHealthStrip";
import { WorkspaceSnapshotPanel } from "@/components/dashboard/WorkspaceSnapshotPanel";
import { ConnectorsReportsPanel } from "@/components/dashboard/ConnectorsReportsPanel";
import { WorkspaceLaunchpad } from "@/components/dashboard/WorkspaceLaunchpad";
import { OnboardingResumeCard } from "@/components/onboarding/OnboardingResumeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { fetchClientReadiness, type ClientReadiness } from "@/lib/readiness/computeCampaignReadiness";
import { Building2, Users } from "lucide-react";

/**
 * Canonical Organization Overview at /admin.
 * Reads as an org-level cockpit: workspace launchpad → system health → primary
 * org actions → workspaces/connectors snapshots → readiness/AI guidance.
 */
export default function OverviewPage() {
  const { organization } = useAuth();
  const [readiness, setReadiness] = useState<ClientReadiness | null>(null);
  const [hasClient, setHasClient] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", organization.id)
      .limit(1)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data?.id) {
          setHasClient(true);
          const r = await fetchClientReadiness(data.id);
          setReadiness(r);
        } else {
          setHasClient(false);
          setReadiness(null);
        }
        setLoading(false);
      });
  }, [organization]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{organization?.name || "Organization Overview"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Workspaces, connectors, reports, and live operations at a glance</p>
        </div>
      </div>

      <WorkspaceLaunchpad organizationId={organization?.id} />

      <SystemHealthStrip organizationId={organization?.id} />

      <QuickActionsGrid />

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceSnapshotPanel organizationId={organization?.id} />
        <ConnectorsReportsPanel organizationId={organization?.id} />
      </div>

      {hasClient === false && !loading ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Readiness and AI guidance unlock once this organization has its first client. Add a client to get a tailored go-live checklist."
          action={
            <Button asChild size="sm">
              <Link to="/admin/clients">Add your first client</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ReadinessChecklist readiness={readiness} loading={loading} title="Setup Progress" />
          <AIGuidanceCard readiness={readiness} />
        </div>
      )}

      <OnboardingResumeCard />
    </div>
  );
}
