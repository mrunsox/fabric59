import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_SECTIONS } from "@/config/navigation";

/**
 * WorkspaceShell (Phase 2A — canonical /app/workspaces/:workspaceId/*)
 *
 * Real workspace-scoped chrome: workspace switcher, breadcrumb, secondary nav from
 * WORKSPACE_SECTIONS. Workspace identity is sourced from the URL via WorkspaceProvider
 * which currently adapts Organization -> Workspace until a real workspaces table exists.
 */
function WorkspaceChrome() {
  const { workspace, workspaces, isLoading, notFound } = useWorkspace();
  const { organization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const sectionKey = useMemo(() => {
    const m = location.pathname.match(/\/app\/workspaces\/[^/]+\/([^/]+)/);
    return m?.[1] ?? "home";
  }, [location.pathname]);
  const activeSection = WORKSPACE_SECTIONS.find((s) => s.href === sectionKey) ?? WORKSPACE_SECTIONS[0];

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
              The workspace <code className="text-xs">{workspaceId}</code> is not available for your account.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/app/workspaces")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Workspace header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="mx-auto max-w-[1440px] px-8 h-14 flex items-center gap-3">
          {/* Breadcrumb: Organization > Workspace > Section */}
          <nav className="flex items-center gap-2 text-sm min-w-0" aria-label="Breadcrumb">
            <Link to="/admin/dashboard" className="text-muted-foreground/70 hover:text-foreground truncate">
              {organization?.name ?? "Organization"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            {workspaces.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-2 px-2 h-7">
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
                      onClick={() => navigate(`/app/workspaces/${w.id}/${sectionKey}`)}
                      className={cn(w.id === workspace.id && "bg-accent")}
                    >
                      {w.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="font-semibold text-foreground truncate">{workspace.name}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-foreground/80 truncate">{activeSection.label}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/admin/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Org admin
              </Link>
            </Button>
          </div>
        </div>

        {/* Secondary nav — canonical 13 */}
        <div className="border-t border-border/40">
          <div className="mx-auto max-w-[1440px] px-8">
            <div className="flex items-center gap-1 overflow-x-auto -mb-px">
              {WORKSPACE_SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <NavLink
                    key={s.key}
                    to={`/app/workspaces/${workspace.id}/${s.href}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                        isActive || activeSection.key === s.key
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function WorkspaceShell() {
  return (
    <WorkspaceProvider>
      <WorkspaceChrome />
    </WorkspaceProvider>
  );
}
