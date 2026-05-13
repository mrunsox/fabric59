import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Phase 2 — Smart post-auth redirect.
 *
 * Mounted at /launch. Used as the canonical landing target after sign-in,
 * sign-up, password reset, and invite acceptance. Decides where to send
 * the authenticated user based on real org + workspace state, so the
 * decision logic lives in one place.
 *
 * Routing matrix:
 *   - not authenticated         → /login
 *   - master admin (no org)     → /superadmin
 *   - no org at all             → /onboarding
 *   - org but no workspaces yet → /onboarding (workspace bootstrap step)
 *   - org + at least 1 workspace
 *       → /w/:defaultWorkspaceId/home (default-flagged first, else first)
 *
 * Invite continuity: if /launch?invite=<token> is provided, the token is
 * forwarded to the destination so downstream surfaces can consume it.
 *
 * Must be mounted inside a <WorkspaceProvider> so this component can read
 * the user's workspaces. /launch is wrapped accordingly in App.tsx.
 */
export default function LaunchRedirectPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invite = params.get("invite");
  const { isAuthenticated, isLoading, organization, organizations, isMasterAdmin } = useAuth();
  const { workspaces, isLoading: wsLoading } = useWorkspace();

  const ready = !isLoading && !wsLoading;

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      navigate(invite ? `/login?invite=${encodeURIComponent(invite)}` : "/login", { replace: true });
      return;
    }
    if (isMasterAdmin && organizations.length === 0) {
      navigate("/superadmin", { replace: true });
      return;
    }
    if (organizations.length === 0) {
      navigate(invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : "/onboarding", {
        replace: true,
      });
      return;
    }
    const orgId = organization?.id ?? organizations[0]?.id ?? null;
    const orgWorkspaces = orgId ? workspaces.filter((w) => w.organization_id === orgId) : workspaces;
    const target =
      orgWorkspaces.find((w) => w.is_default) ??
      orgWorkspaces[0] ??
      null;

    if (!target) {
      navigate(invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : "/onboarding", {
        replace: true,
      });
      return;
    }
    navigate(`/w/${target.id}/home`, { replace: true });
  }, [ready, isAuthenticated, isMasterAdmin, organization, organizations, workspaces, invite, navigate]);

  if (!isAuthenticated && ready) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Landing your workspace…</p>
      </div>
    </div>
  );
}
