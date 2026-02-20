import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2,
  FileJson,
  Activity,
  TestTube2,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  Globe,
  ChevronDown,
  Map,
  FlaskConical,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";

const navigation = [
  { name: "Tenants", href: "/admin", icon: Building2 },
  { name: "Five9 Domains", href: "/admin/domains", icon: Globe },
  { name: "Field Mappings", href: "/admin/mappings", icon: FileJson },
  { name: "Agents", href: "/admin/agents", icon: Users },
  { name: "API Logs", href: "/admin/logs", icon: Activity },
  { name: "Notifications", href: "/admin/notifications", icon: Bell },
  { name: "Test Console", href: "/admin/test", icon: TestTube2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Build Outline", href: "/outline", icon: Map },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { organization, organizations, switchOrganization, signOut, user, devMode, toggleDevMode, isMasterAdmin } = useAuth();

  const currentPage = navigation.find((item) => 
    location.pathname === item.href || 
    (item.href !== "/admin" && location.pathname.startsWith(item.href))
  );

  return (
    <div className="dark min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <Fabric59Icon size="md" className="glow-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Fabric59
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Integration Hub
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                      )}
                    />
                    {item.name}
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4 text-sidebar-primary-foreground/70" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <DashboardSwitcher current="admin" />
            {/* Org Switcher */}
            {organizations.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-left">
                    <span className="truncate">{organization?.name}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => switchOrganization(org.id)}
                      className={cn(org.id === organization?.id && "bg-accent")}
                    >
                      {org.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {user?.email?.slice(0, 2).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {organization?.name || "Loading..."}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{currentPage?.name || "Dashboard"}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* DEV MODE toggle — only visible in development */}
            {import.meta.env.DEV && (
              <button
                onClick={toggleDevMode}
                className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                  devMode
                    ? "bg-warning/20 text-warning border-warning/40 animate-pulse"
                    : "bg-muted text-muted-foreground border-border hover:border-warning/40 hover:text-warning"
                }`}
                title={devMode ? "Click to disable Dev Mode" : "Click to enable Dev Mode (bypasses auth)"}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {devMode ? "DEV MODE ON" : "DEV MODE"}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">All Systems Operational</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
