import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { toast } from "sonner";

const STEPS = [
  { key: "land", label: "Land workspace", description: "Confirm your canonical workspace" },
];

const FIRST_RUN = [
  "Default workspace home tailored to your role",
  "Canonical guides, templates, and runbooks unlocked",
  "Adapters available: Five9, Clio Manage, Clio Grow, MyCase",
  "Concierge follow-up to validate mappings before go-live",
];

/**
 * Phase 9 — Workspace bootstrap.
 *
 * Lands a freshly onboarded user into a real canonical workspace. Prefers the
 * auto-created default workspace from the Phase 2B trigger; if none exists,
 * creates one against the user's organization, then routes to
 * /app/workspaces/:id/home.
 */
export default function WorkspaceBootstrapPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const { workspaces, isLoading, refetch } = useWorkspace();
  const navigate = useNavigate();

  const [workspaceName, setWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isMasterAdmin && !organization) navigate("/superadmin", { replace: true });
  }, [isMasterAdmin, organization, navigate]);

  useEffect(() => {
    if (!workspaceName && organization?.name) setWorkspaceName(`${organization.name} workspace`);
  }, [organization?.name, workspaceName]);

  const existingDefault =
    workspaces.find((w) => w.organization_id === organization?.id && w.is_default) ??
    workspaces.find((w) => w.organization_id === organization?.id);

  const handleEnterExisting = () => {
    if (!existingDefault) return;
    navigate(`/app/workspaces/${existingDefault.id}/home`, { replace: true });
  };

  const handleCreate = async () => {
    if (!organization?.id) {
      toast.error("No organization found. Finish onboarding first.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          organization_id: organization.id,
          name: workspaceName.trim() || `${organization.name} workspace`,
          is_default: workspaces.length === 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      await refetch();
      toast.success("Workspace ready");
      navigate(`/app/workspaces/${data.id}/home`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Could not create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <OnboardingShell
      title="Workspace bootstrap | Fabric59"
      description="Land your first canonical workspace."
      steps={STEPS}
      activeKey="land"
      heading="Land your workspace"
      subheading="Workspaces are the canonical operating boundary in Fabric59. Each one owns its clients, campaigns, guides, integrations, QA, and analytics."
    >
      <div className="space-y-6 max-w-xl">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : existingDefault ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-4 flex items-center gap-3 bg-muted/20">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{existingDefault.name}</p>
                <p className="text-xs text-muted-foreground">
                  Default workspace for {organization?.name}
                </p>
              </div>
            </div>
            <Button onClick={handleEnterExisting} className="w-full sm:w-auto h-11">
              Enter workspace <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Main workspace"
                className="h-11"
              />
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full sm:w-auto h-11">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create workspace
            </Button>
          </div>
        )}

        <div className="rounded-xl border border-border/60 p-5 bg-muted/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            What you get on first run
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            {FIRST_RUN.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" /> {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </OnboardingShell>
  );
}
