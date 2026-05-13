import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Phase 2 — Org membership guard.
 *
 * Use to wrap routes that REQUIRE an org membership context (e.g. /org/*).
 * Stricter than the generic ProtectedRoute, which only checks
 * authentication.
 *
 * Behavior:
 *   - If auth state is still loading, render a loading state.
 *   - If unauthenticated, redirect to /login (preserve `from`).
 *   - Master admins are exempt — they can access /org/* without an org
 *     membership row, mirroring existing /admin behavior.
 *   - If authenticated but the user has no org memberships at all,
 *     redirect to /onboarding so they can bootstrap their first org.
 *   - Otherwise, render the matched outlet.
 *
 * Source of truth for org membership is AuthContext.organizations
 * (loaded from organization_members + organizations tables under RLS).
 * No client-only role assumptions — server-side RLS still gates the data.
 */
export function OrgProtectedRoute() {
  const { isAuthenticated, isLoading, organizations, isMasterAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isMasterAdmin && organizations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export default OrgProtectedRoute;
