import { useMemo } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_NAV } from "@/config/canonicalNav";

/**
 * Phase 0 — Canonical WorkspaceShell.
 *
 * Mounted at /w/:workspaceId/*. Sidebar = canonical 12 workspace items.
 * Top bar = workspace switcher, breadcrumb (Org → Workspace → Section),
 * notifications, profile slot. SidebarTrigger lives in the top bar so
 * it remains visible in collapsed/icon mode.
 */
function WorkspaceSidebar({ workspaceId }: { workspaceId: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (to: string) => {
    const full = `/w/${workspaceId}/${to}`;
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 px-3 flex flex-row items-center gap-2.5 border-b border-border/40">
        <Fabric59Icon size="sm" />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Fabric59
          </span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <NavLink
                        to={`/w/${workspaceId}/${item.to}`}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function WorkspaceChrome() {
  const { workspace, workspaces, isLoading, notFound } = useWorkspace();
  const { organization } = useAuth();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const sectionKey = useMemo(() => {
    const m = location.pathname.match(/\/w\/[^/]+\/([^/]+)/);
    return m?.[1] ?? "home";
  }, [location.pathname]);
  const activeSection =
    WORKSPACE_NAV.find((s) => s.to === sectionKey) ?? WORKSPACE_NAV[0];

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading workspace…</div>;
  }
  if (notFound || !workspace) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h1 className="text-lg font-semibold">Workspace not found</h1>
            <p className="text-sm text-muted-foreground">
              The workspace <code className="text-xs">{workspaceId}</code> is not available
              for your account.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/workspaces")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <WorkspaceSidebar workspaceId={workspace.id} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <nav
              className="flex items-center gap-2 text-sm min-w-0"
              aria-label="Breadcrumb"
            >
              <Link
                to="/org"
                className="text-muted-foreground/80 hover:text-foreground truncate"
              >
                {organization?.name ?? "Organization"}
              </Link>
              <span className="text-muted-foreground/40">/</span>
              {workspaces.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-1 px-2 h-7">
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {workspace.name}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {workspaces.map((w) => (
                      <DropdownMenuItem
                        key={w.id}
                        onClick={() => navigate(`/w/${w.id}/${sectionKey}`)}
                        className={cn(w.id === workspace.id && "bg-accent")}
                      >
                        {w.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="font-semibold text-foreground truncate">
                  {workspace.name}
                </span>
              )}
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground/80 truncate">{activeSection.label}</span>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

/** Index redirect /w/:workspaceId → /w/:workspaceId/home */
export function WorkspaceIndexRedirect() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <Navigate to={`/w/${workspaceId}/home`} replace />;
}

export function WorkspaceShell() {
  return (
    <WorkspaceProvider>
      <WorkspaceChrome />
    </WorkspaceProvider>
  );
}

export default WorkspaceShell;
