import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, organization, isMasterAdmin } = useAuth();
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

  // If user is authenticated but has no organization, redirect.
  // Master admins go to /superadmin (operator surface), regular users to
  // /onboarding. Allow /onboarding, /superadmin, and /launch through so the
  // resolver and operator surfaces never bounce back to themselves.
  if (!organization) {
    const path = location.pathname;
    const onAllowed =
      path.startsWith("/onboarding") ||
      path.startsWith("/superadmin") ||
      path.startsWith("/launch");
    if (onAllowed) return <Outlet />;
    return <Navigate to={isMasterAdmin ? "/superadmin" : "/onboarding"} replace />;
  }

  return <Outlet />;
}
