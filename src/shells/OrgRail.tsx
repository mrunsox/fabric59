import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { GLOBAL_SECTIONS, findActiveSection } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ShieldCheck } from "lucide-react";

/**
 * OrgRail — always-visible 56px vertical icon strip giving org context from
 * anywhere in the app, including inside a workspace shell. Hover the rail to
 * expand to a 220px label strip (CSS-only, no JS state). Items mirror the
 * canonical org sections (Overview, Workspaces, Connectors, Reports,
 * Notifications, Settings, Billing).
 *
 * Rendered to the left of WorkspaceShell so the org rail is present
 * Supabase-style whenever the user is inside a workspace.
 */
export function OrgRail() {
  const { pathname } = useLocation();
  const { hasPermission, isMasterAdmin, signOut } = useAuth();
  const active = findActiveSection(pathname);
  const visible = GLOBAL_SECTIONS.filter((s) => !s.permission || hasPermission(s.permission));

  return (
    <aside
      data-testid="org-rail"
      className="group/orgrail relative z-40 hidden lg:flex flex-col py-3 bg-sidebar border-r border-sidebar-border/40 w-14 hover:w-56 transition-[width] duration-200 ease-out shrink-0"
    >
      <NavLink
        to="/admin"
        className="mb-3 flex items-center gap-2 px-3 h-10 shrink-0"
        aria-label="Fabric59 organization"
      >
        <Fabric59Icon size="sm" />
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground opacity-0 group-hover/orgrail:opacity-100 transition-opacity duration-150 whitespace-nowrap">
          Fabric59
        </span>
      </NavLink>

      <nav className="flex-1 flex flex-col gap-1 px-2 min-w-0">
        {visible.map((s) => {
          const Icon = s.icon;
          const isActive = active?.key === s.key;
          return (
            <Tooltip key={s.key} delayDuration={300}>
              <TooltipTrigger asChild>
                <NavLink
                  to={s.href}
                  className={cn(
                    "relative flex items-center h-9 rounded-lg transition-colors gap-3 px-2.5 overflow-hidden",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                  aria-label={s.label}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium truncate opacity-0 group-hover/orgrail:opacity-100 transition-opacity duration-150">
                    {s.label}
                  </span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="group-hover/orgrail:hidden">
                {s.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-2 pt-2 border-t border-sidebar-border/40">
        {isMasterAdmin && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <NavLink
                to="/superadmin"
                className={({ isActive }) =>
                  cn(
                    "flex items-center h-9 rounded-lg transition-colors gap-3 px-2.5 overflow-hidden border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10",
                  )
                }
                aria-label="Platform Admin"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate opacity-0 group-hover/orgrail:opacity-100 transition-opacity duration-150">
                  Platform Admin
                </span>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="group-hover/orgrail:hidden">
              Platform Admin
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => signOut()}
              className="flex items-center h-9 rounded-lg transition-colors gap-3 px-2.5 overflow-hidden text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate opacity-0 group-hover/orgrail:opacity-100 transition-opacity duration-150">
                Sign out
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="group-hover/orgrail:hidden">
            Sign out
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

export default OrgRail;
