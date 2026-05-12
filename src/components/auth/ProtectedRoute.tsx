import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, organization, isMasterAdmin, orgRole } = useAuth();
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

  // If user is authenticated but has no organization, redirect to onboarding.
  // Master admins are exempt — they can access /admin without an org.
  // Phase 9: any /onboarding/* route is treated as a valid onboarding surface,
  // so the workspace bootstrap step at /onboarding/workspace is reachable.
  if (!organization && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }

  // Phase A (QA Readiness): /admin is the single canonical org overview for ALL roles.
  // Previous member→/admin/dashboard redirect removed (would now loop, since /admin/dashboard → /admin).

  return <Outlet />;
}
