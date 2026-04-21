import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SUPERADMIN_SECTIONS } from "@/config/superadmin-navigation";

export function SuperadminShell() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Fabric59Icon size="sm" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground leading-tight">Superadmin</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Feature Vault</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {SUPERADMIN_SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.href}
                end={item.href === "/superadmin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1440px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
