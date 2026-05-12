import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Building, CheckCircle, Sparkles } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { toast } from "sonner";

const STARTER_DEFAULTS = [
  "Default workspace name set",
  "First client placeholder ready (add yours after launch)",
  "Canonical guides + templates galleries unlocked",
  "Workspace analytics + QA + billing surfaces wired",
  "Integrations: Five9 + MyCase / Clio adapters available",
];

/**
 * Phase 9 — Workspace bootstrap.
 *
 * Lands a freshly onboarded user into a real canonical workspace. Prefers the
 * auto-created default workspace from the Phase 2B trigger; if none exists,
 * creates one against the user's organization. Then routes into
 * /app/workspaces/:id/home with sensible first-run defaults.
 */
export default function WorkspaceBootstrapPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const { workspaces, isLoading, refetch } = useWorkspace();
  const navigate = useNavigate();

  const [workspaceName, setWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If user is master admin without an org, send them to /superadmin.
  useEffect(() => {
    if (isMasterAdmin && !organization) navigate("/superadmin", { replace: true });
  }, [isMasterAdmin, organization, navigate]);

  // Default the workspace name from the org name once it loads.
  useEffect(() => {
    if (!workspaceName && organization?.name) setWorkspaceName(`${organization.name} workspace`);
  }, [organization?.name, workspaceName]);

  // If a workspace already exists for this org, prefer the default and surface it.
  const existingDefault = workspaces.find((w) => w.organization_id === organization?.id && w.is_default)
    ?? workspaces.find((w) => w.organization_id === organization?.id);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead title="Workspace bootstrap | Fabric59" description="Land your first canonical workspace." noindex />
      <div className="w-full max-w-lg space-y-4">
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
                <Building className="h-7 w-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl tracking-tight">Land your workspace</CardTitle>
            <CardDescription>
              Workspaces are the canonical operating boundary in Fabric59. Each one owns its clients,
              campaigns, guides, integrations, QA, and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : existingDefault ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{existingDefault.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Default workspace for {organization?.name}
                    </p>
                  </div>
                </div>
                <Button onClick={handleEnterExisting} className="w-full h-11">
                  Enter workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
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
                <Button onClick={handleCreate} disabled={submitting} className="w-full h-11">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Create workspace
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">First-run defaults</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {STARTER_DEFAULTS.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /> {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
