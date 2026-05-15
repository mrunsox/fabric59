import { useMemo } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ChevronDown, ArrowLeft, Plus, LogOut, UserCircle2, Command as CommandIcon, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SEOHead } from "@/components/seo/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_NAV, WORKSPACE_NAV_GROUPS, WORKSPACE_NAV_PINNED } from "@/config/canonicalNav";
import { useKeyboardNav, KEYBOARD_HINTS } from "@/hooks/useKeyboardNav";
import { WorkspaceCommandPalette } from "@/components/workspace/WorkspaceCommandPalette";

/**
 * Canonical WorkspaceShell — premium polish pass.
 *
 * Layout: grouped sidebar (Build / Operate / Intelligence / Settings),
 * top bar with breadcrumb (Org → Workspace → Section), ⌘K palette hint,
 * notifications, and account menu. Global ⌘K opens command palette,
 * "g + key" shortcuts jump between sections.
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
      <SidebarContent className="py-1">
        {WORKSPACE_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  const hint = KEYBOARD_HINTS[item.to];
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-150",
                          active &&
                            "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-12px_hsl(var(--primary)/0.35)]",
                        )}
                      >
                        <NavLink
                          to={`/w/${workspaceId}/${item.to}`}
                          className="flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span>{item.label}</span>
                              {hint && (
                                <kbd className="ml-auto hidden group-hover/menu-item:inline-flex text-[9px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground/70 tracking-wider">
                                  {hint}
                                </kbd>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {WORKSPACE_NAV_PINNED.length > 0 && (
        <SidebarFooter className="border-t border-border/40">
          <SidebarSeparator className="hidden" />
          <SidebarMenu>
            {WORKSPACE_NAV_PINNED.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.label}
                  >
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
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
          {user?.email ?? "Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/admin")}>
          <Building2 className="h-4 w-4 mr-2" /> Organization
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
          <UserCircle2 className="h-4 w-4 mr-2" /> Profile & settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotFoundCard() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return (
    <div className="p-8">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-lg font-semibold">Workspace not found</h1>
          <p className="text-sm text-muted-foreground">
            <code className="text-xs">{workspaceId}</code> isn't available for your
            account. Pick another workspace below or create a new one.
          </p>
          {workspaces.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {workspaces.map((w) => (
                <Button
                  key={w.id}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/w/${w.id}/home`)}
                >
                  {w.name}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="default" size="sm" onClick={() => navigate("/admin/workspaces?new=1")}>
              <Plus className="h-4 w-4 mr-1.5" /> Create workspace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceChrome() {
  const { workspace, workspaces, isLoading, notFound } = useWorkspace();
  const { organization } = useAuth();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  useKeyboardNav(workspace?.id);

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
    return <NotFoundCard />;
  }

  return (
    <SidebarProvider>
      <SEOHead
        title={`${activeSection.label} · ${workspace.name} · Fabric59`}
        description={`${activeSection.label} workspace surface in Fabric59.`}
        noindex
      />
      <WorkspaceCommandPalette />
      <div className="min-h-screen flex w-full bg-background">
        <WorkspaceSidebar workspaceId={workspace.id} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 bg-background/85 backdrop-blur-md border-b border-border/40 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <nav
              className="flex items-center gap-2 text-sm min-w-0"
              aria-label="Breadcrumb"
            >
              <Link
                to="/admin"
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
                  <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Switch workspace
                    </DropdownMenuLabel>
                    {workspaces.map((w) => (
                      <DropdownMenuItem
                        key={w.id}
                        onClick={() => navigate(`/w/${w.id}/${sectionKey}`)}
                        className={cn(w.id === workspace.id && "bg-accent")}
                      >
                        {w.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin/workspaces?new=1")}>
                      <Plus className="h-4 w-4 mr-2" /> Create workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="font-semibold text-foreground truncate" title={workspace.id}>
                  {workspace.name}
                </span>
              )}
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground/80 truncate">{activeSection.label}</span>
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(ev);
                }}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border/60 bg-background hover:bg-muted/60 text-xs text-muted-foreground transition-colors"
                aria-label="Open command palette"
                data-testid="workspace-cmdk-trigger"
              >
                <CommandIcon className="h-3 w-3" />
                <span>Quick jump</span>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground/80">
                  ⌘K
                </kbd>
              </button>
              <NotificationBell />
              <AccountMenu />
            </div>
          </header>
          <main className="flex-1 p-6">
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
