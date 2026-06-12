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
import { DashboardHeader } from "@/components/dashboard/sections/DashboardHeader";


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
      <DashboardHeader
        icon={Building2}
        title={organization?.name || "Organization Overview"}
        subtitle="Workspaces, connectors, reports, and live operations at a glance"
        scope="organization"
      />


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
