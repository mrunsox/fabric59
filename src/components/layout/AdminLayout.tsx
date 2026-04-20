import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2, FileJson, Activity, TestTube2, Settings, Menu, X, LogOut,
  ChevronRight, ChevronDown, Bell, Globe, Map, FlaskConical, Users,
  Handshake, Plug, ListPlus, Workflow, Megaphone, LayoutDashboard,
  BarChart3, Terminal, Zap as AgentZap, Eye, Search, DollarSign, Zap,
  Ban, PhoneCall, ShieldAlert, Database, Link2, Wrench, BookOpen,
  GraduationCap, MessageSquare, Target, Copy, Scale, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { AdminTour } from "@/components/onboarding/AdminTour";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { AssistantButton } from "@/components/assistant/AssistantButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
      { name: "Clients", href: "/admin", icon: Building2, permission: "tenants" },
      { name: "Partners", href: "/admin/partners", icon: Handshake, permission: "tenants" },
      { name: "Five9 Domains", href: "/admin/domains", icon: Globe, permission: "domains" },
      { name: "Agents", href: "/admin/agents", icon: Users, permission: "agents" },
      { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone, permission: "domains" },
      { name: "Dispositions", href: "/admin/dispositions", icon: ListPlus, permission: "domains" },
      { name: "Blueprints", href: "/admin/campaign-blueprints", icon: Copy, permission: "domains" },
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permission: "domains" },
      { name: "Billing & Invoices", href: "/admin/billing", icon: DollarSign, permission: "settings" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { name: "Legal Connect (Global)", href: "/admin/legal-connect", icon: Scale, permission: "integrations" },
      { name: "Integrations", href: "/admin/integrations", icon: Plug, permission: "integrations" },
      { name: "Field Mappings", href: "/admin/mappings", icon: FileJson, permission: "mappings" },
    ],
  },
  {
    label: "Agent Tools",
    items: [
      { name: "ScriptFlow", href: "/admin/scriptflow", icon: Workflow, permission: "domains" },
      { name: "Scripts", href: "/admin/scripts", icon: FileJson, permission: "domains" },
      { name: "Scripter", href: "/admin/scripter", icon: Terminal, permission: null },
      { name: "Agent Dashboard", href: "/admin/agent-dashboard", icon: AgentZap, permission: null },
      { name: "Supervisor", href: "/admin/supervisor", icon: Eye, permission: "domains" },
      { name: "QA & Analytics", href: "/admin/qa", icon: Search, permission: "domains" },
      { name: "Goals & Coaching", href: "/admin/goals", icon: Target, permission: "domains" },
      { name: "Knowledge Base", href: "/admin/kb", icon: BookOpen, permission: null },
      { name: "Training", href: "/admin/training", icon: GraduationCap, permission: null },
    ],
  },
  {
    label: "Configuration",
    items: [
      { name: "Call Flow Builder", href: "/admin/call-flow", icon: Workflow, permission: "call_flow" },
      { name: "Automations", href: "/admin/automations", icon: Zap, permission: "domains" },
      { name: "ANI Block List", href: "/admin/ani-blocklist", icon: Ban, permission: "domains" },
      { name: "Callback Queue", href: "/admin/callback-queue", icon: PhoneCall, permission: "domains" },
      { name: "Abandon Rate", href: "/admin/abandon-rate", icon: ShieldAlert, permission: "domains" },
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
  {
    label: "Platform",
    items: [
      { name: "Data Plane", href: "/admin/data-plane", icon: Database, permission: "domains" },
      { name: "Identity Resolution", href: "/admin/identity", icon: Link2, permission: "domains" },
      { name: "Utilities", href: "/admin/utilities", icon: Wrench, permission: "settings" },
      { name: "Design System", href: "/admin/design-system", icon: Palette, permission: null },
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

function findParentGroup(pathname: string): string | null {
  for (const group of navigationGroups) {
    if (group.items.some((item) => isItemActive(item.href, pathname))) {
      return group.label;
    }
  }
  return null;
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, organizations, switchOrganization, signOut, user, devMode, toggleDevMode, isMasterAdmin, hasPermission } = useAuth();

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

  const allItems = [...topNav, ...navigationGroups.flatMap((g) => g.items), ...bottomNav];
  const filteredAll = allItems.filter(canView);
  const currentPage = filteredAll.find((item) => isItemActive(item.href, location.pathname));
  const parentGroup = findParentGroup(location.pathname);

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item.href, location.pathname);
    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-premium relative",
          isActive
            ? "bg-sidebar-accent/50 text-sidebar-foreground font-semibold"
            : "text-sidebar-foreground/55 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground font-medium"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary" />
        )}
        <item.icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive ? "text-primary" : "text-sidebar-foreground/35 group-hover:text-sidebar-foreground/60"
          )}
        />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {!isMasterAdmin && <AdminTour />}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          "bg-gradient-to-b from-sidebar via-sidebar to-[hsl(222,47%,3%)] border-r border-sidebar-border/40",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6">
            <Fabric59Icon size="md" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Fabric59</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">Integration Hub</span>
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
          <div className="mx-4 divider-gradient" />

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-0.5">
              {topNav.filter(canView).map(renderNavItem)}

              {navigationGroups.map((group) => {
                const visibleItems = group.items.filter(canView);
                if (visibleItems.length === 0) return null;
                const open = isGroupOpen(group.label, visibleItems);

                return (
                  <Collapsible key={group.label} open={open} onOpenChange={() => toggleGroup(group.label)}>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 mt-6 cursor-pointer hover:bg-sidebar-accent/15 transition-premium">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/25 flex-1 text-left">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-sidebar-foreground/20 transition-transform duration-200",
                          open && "rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 mt-0.5">
                      {visibleItems.map(renderNavItem)}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 space-y-3">
            <div className="mx-1 divider-gradient mb-3" />
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
              className="flex items-center gap-3 rounded-xl bg-sidebar-accent/20 p-3 cursor-pointer hover:bg-sidebar-accent/35 transition-premium border border-sidebar-border/20"
              onClick={() => navigate("/admin/settings")}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/8">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.slice(0, 2).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {organization?.name || "Loading..."}
                </p>
                <p className="text-[11px] text-sidebar-foreground/35 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={(e) => { e.stopPropagation(); signOut(); }}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 px-6 border-b border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 text-sm">
            {parentGroup && (
              <>
                <span className="text-muted-foreground/50 text-xs font-medium">{parentGroup}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
              </>
            )}
            {currentPage && (
              <div className="flex items-center gap-1.5">
                <currentPage.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="font-medium text-foreground">{currentPage.name}</span>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {import.meta.env.DEV && (
              <button
                onClick={toggleDevMode}
                className={cn(
                  "hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-premium",
                  devMode
                    ? "bg-warning/15 text-warning border-warning/30 animate-pulse"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-warning/30 hover:text-warning"
                )}
              >
                <FlaskConical className="h-3 w-3" />
                {devMode ? "DEV ON" : "DEV"}
              </button>
            )}

            <NotificationBell />
            <HealthIndicator status="healthy" label="All Systems" />
          </div>
        </header>

        <main className="overflow-y-auto h-[calc(100vh-3.5rem)] p-6">
          <Outlet />
        </main>
      </div>
      <ScrollToTopButton />
      <AssistantButton />
    </div>
  );
}
