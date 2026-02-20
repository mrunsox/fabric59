import { Link } from "react-router-dom";
import { LayoutDashboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  current: "master" | "admin";
}

export function DashboardSwitcher({ current }: Props) {
  const { isMasterAdmin } = useAuth();

  if (!isMasterAdmin) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
        Switch Dashboard
      </p>
      <Link
        to="/master"
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
          current === "master"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Settings2 className="h-3.5 w-3.5" />
        System Admin
      </Link>
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
    </div>
  );
}
