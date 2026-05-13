import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
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
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { ORG_NAV } from "@/config/canonicalNav";

/**
 * Phase 0 — Canonical OrgShell.
 *
 * Mounted at /org/*. Uses shadcn Sidebar with collapsible="icon" and a
 * top bar that owns SidebarTrigger so the trigger stays visible when
 * the rail is collapsed. Workspace switcher routes to /w/:id/home.
 */
function OrgSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (to: string) => {
    const full = `/org${to ? `/${to}` : ""}`;
    return pathname === full || (to !== "" && pathname.startsWith(`${full}/`));
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
              {ORG_NAV.map((item) => {
                const Icon = item.icon;
                const to = `/org${item.to ? `/${item.to}` : ""}`;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <NavLink to={to} className="flex items-center gap-2">
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

function OrgChrome() {
  const { organization } = useAuth();
  const { workspaces } = useWorkspace();
  const navigate = useNavigate();

  const defaultWorkspace = useMemo(
    () => workspaces.find((w) => w.is_default) ?? workspaces[0] ?? null,
    [workspaces],
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <OrgSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-foreground truncate">
                {organization?.name ?? "Organization"}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {workspaces.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                      Switch to workspace
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {workspaces.map((w) => (
                      <DropdownMenuItem
                        key={w.id}
                        onClick={() => navigate(`/w/${w.id}/home`)}
                        className={cn(w.id === defaultWorkspace?.id && "bg-accent")}
                      >
                        {w.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <NotificationBell />
              <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                <Link to="/admin">Legacy admin</Link>
              </Button>
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

export function OrgShell() {
  return (
    <WorkspaceProvider>
      <OrgChrome />
    </WorkspaceProvider>
  );
}

export default OrgShell;
