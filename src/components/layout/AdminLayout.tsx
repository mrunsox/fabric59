import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
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
  ChevronDown,
  Bell,
  Globe,
  Map,
  FlaskConical,
  Users,
  Handshake,
  Plug,
  ListPlus,
  Workflow,
  Megaphone,
  LayoutDashboard,
  BarChart3,
  FileSpreadsheet,
  Terminal,
  Zap as AgentZap,
  Eye,
  Search,
  DollarSign,
  Zap,
  Ban,
  PhoneCall,
  ShieldAlert,
  Database,
  Link2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { AdminTour } from "@/components/onboarding/AdminTour";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null;
};

const topNav: NavItem[] = [
  { name: "My Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: null },
];

const navigationGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { name: "Five9 Domains", href: "/admin/domains", icon: Globe, permission: "domains" },
      { name: "Agents", href: "/admin/agents", icon: Users, permission: "agents" },
      { name: "Clients", href: "/admin", icon: Building2, permission: "tenants" },
      { name: "Partners", href: "/admin/partners", icon: Handshake, permission: "tenants" },
      { name: "Dispositions", href: "/admin/dispositions", icon: ListPlus, permission: "domains" },
      { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone, permission: "domains" },
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permission: "domains" },
      { name: "Report59", href: "/admin/upload", icon: FileSpreadsheet, permission: "domains" },
      { name: "Billing & Invoices", href: "/admin/billing", icon: DollarSign, permission: "settings" },
    ],
  },
  {
    label: "Agent Tools",
    items: [
      { name: "Scripts", href: "/admin/scripts", icon: FileJson, permission: "domains" },
      { name: "Scripter", href: "/admin/scripter", icon: Terminal, permission: null },
      { name: "Agent Dashboard", href: "/admin/agent-dashboard", icon: AgentZap, permission: null },
      { name: "Supervisor", href: "/admin/supervisor", icon: Eye, permission: "domains" },
      { name: "QA & Analytics", href: "/admin/qa", icon: Search, permission: "domains" },
      { name: "Knowledge Base", href: "/admin/kb", icon: BookOpen, permission: null },
      { name: "Training", href: "/admin/training", icon: GraduationCap, permission: null },
    ],
  },
  {
    label: "Configuration",
    items: [
      { name: "Integrations", href: "/admin/integrations", icon: Plug, permission: "integrations" },
      { name: "Field Mappings", href: "/admin/mappings", icon: FileJson, permission: "mappings" },
      { name: "Call Flow Builder", href: "/admin/call-flow", icon: Workflow, permission: "call_flow" },
      { name: "Automations", href: "/admin/automations", icon: Zap, permission: "domains" },
      { name: "ANI Block List", href: "/admin/ani-blocklist", icon: Ban, permission: "domains" },
      { name: "Callback Queue", href: "/admin/callback-queue", icon: PhoneCall, permission: "domains" },
      { name: "Abandon Rate", href: "/admin/abandon-rate", icon: ShieldAlert, permission: "domains" },
      
    ],
  },
  {
    label: "Platform",
    items: [
      { name: "Data Plane", href: "/admin/data-plane", icon: Database, permission: "domains" },
      { name: "Identity Resolution", href: "/admin/identity", icon: Link2, permission: "domains" },
      { name: "Utilities", href: "/admin/utilities", icon: Wrench, permission: "settings" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { name: "API Logs", href: "/admin/logs", icon: Activity, permission: "logs" },
      { name: "Test Console", href: "/admin/test", icon: TestTube2, permission: "test_console" },
      { name: "Notifications", href: "/admin/notifications", icon: Bell, permission: "notifications" },
      { name: "Feedback", href: "/admin/feedback", icon: MessageSquare, permission: null },
    ],
  },
];

const bottomNav: NavItem[] = [
  { name: "Settings", href: "/admin/settings", icon: Settings, permission: "settings" },
  { name: "Build Outline", href: "/outline", icon: Map, permission: null },
];

const STORAGE_KEY = "fabric59_nav_groups";

function isItemActive(href: string, pathname: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

function groupContainsActive(items: NavItem[], pathname: string) {
  return items.some((item) => isItemActive(item.href, pathname));
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, organizations, switchOrganization, signOut, user, devMode, toggleDevMode, isMasterAdmin, hasPermission } = useAuth();

  // Persistent collapse state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const isGroupOpen = (label: string, items: NavItem[]) => {
    if (groupContainsActive(items, location.pathname)) return true;
    return openGroups[label] ?? false;
  };

  const canView = (item: NavItem) => item.permission === null || hasPermission(item.permission);

  // For breadcrumb
  const allItems = [...topNav, ...navigationGroups.flatMap((g) => g.items), ...bottomNav];
  const filteredAll = allItems.filter(canView);
  const currentPage = filteredAll.find((item) => isItemActive(item.href, location.pathname));

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item.href, location.pathname);
    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
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
        {isActive && <ChevronRight className="ml-auto h-4 w-4 text-sidebar-primary-foreground/70" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMasterAdmin && <AdminTour />}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "dark fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <Fabric59Icon size="md" className="glow-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Fabric59</span>
              <span className="text-xs text-sidebar-foreground/60">Integration Hub</span>
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
              {/* Top-level ungrouped items */}
              {topNav.filter(canView).map(renderNavItem)}

              {/* Collapsible groups */}
              {navigationGroups.map((group) => {
                const visibleItems = group.items.filter(canView);
                if (visibleItems.length === 0) return null;
                const open = isGroupOpen(group.label, visibleItems);

                return (
                  <Collapsible key={group.label} open={open} onOpenChange={() => toggleGroup(group.label)}>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 mt-3 cursor-pointer hover:bg-sidebar-accent/50 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 flex-1 text-left">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform duration-200",
                          open && "rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 mt-1">
                      {visibleItems.map(renderNavItem)}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            {/* Pinned bottom nav */}
            <div className="space-y-0.5">
              {bottomNav.filter(canView).map(renderNavItem)}
            </div>

            <DashboardSwitcher current="admin" />

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

            <div
              className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3 cursor-pointer hover:bg-sidebar-accent/70 transition-colors"
              onClick={() => navigate("/admin/settings")}
            >
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
                onClick={(e) => { e.stopPropagation(); signOut(); }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-6">
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

        <main className="overflow-y-auto h-[calc(100vh-4rem)] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
