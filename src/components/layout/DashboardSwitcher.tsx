import { Link } from "react-router-dom";
import { LayoutDashboard, Settings2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  current: "master" | "admin";
}

export function DashboardSwitcher({ current }: Props) {
  const { isMasterAdmin, orgRole } = useAuth();
  const isOwnerOrAdmin = orgRole === "owner" || orgRole === "admin";

  // Always show switcher — content varies by role
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
        Switch Dashboard
      </p>

      {isMasterAdmin && (
        <Link
          to="/superadmin"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
            current === "master"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Platform Admin
        </Link>
      )}

      {(isOwnerOrAdmin || isMasterAdmin) && (
        <Link
          to="/admin"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
            current === "admin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Admin Dashboard
        </Link>
      )}

      <Link
        to="/admin/dashboard"
        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        My Dashboard
      </Link>
    </div>
  );
}
