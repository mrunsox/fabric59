import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";

export function MasterLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/master", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/master/organizations", icon: Building2, label: "Organizations" },
    { to: "/master/users", icon: Users, label: "Users" },
  ];

  return (
    <div className="dark min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Fabric59Icon size="sm" />
            <span className="font-semibold text-lg text-foreground">System Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <DashboardSwitcher current="master" />
          <div className="text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
