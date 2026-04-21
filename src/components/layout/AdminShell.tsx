import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, ChevronDown, Menu, BookOpen, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { AssistantButton } from "@/components/assistant/AssistantButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GLOBAL_SECTIONS, findActiveSection } from "@/config/navigation";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { Five9DocsPanel } from "@/components/docs/Five9DocsPanel";
import { GuidancePanel } from "@/components/assistant/GuidancePanel";

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, organizations, switchOrganization, signOut, user, hasPermission } = useAuth();
  const [docsOpen, setDocsOpen] = useState(false);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeSection = findActiveSection(location.pathname);
  const visibleSections = GLOBAL_SECTIONS.filter((s) => !s.permission || hasPermission(s.permission));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Global vertical icon rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-16 bg-sidebar border-r border-sidebar-border/40 flex flex-col items-center py-3 transition-transform",
          "lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link to="/admin/dashboard" className="mb-4">
          <Fabric59Icon size="md" />
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1.5 mt-2 w-full px-2">
          {visibleSections.map((s) => {
            const Icon = s.icon;
            const active = activeSection?.key === s.key;
            return (
              <Tooltip key={s.key} delayDuration={300}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={s.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                    )}
                    aria-label={s.label}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-primary" />
                    )}
                    <Icon className="h-5 w-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {s.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2 pb-2">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut()}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 lg:pl-16 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border/40">
          <div className="mx-auto max-w-[1440px] h-full px-8 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-2"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-muted-foreground/70 truncate">
                {organization?.name || "Workspace"}
              </span>
              {activeSection && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="font-semibold text-foreground truncate">{activeSection.label}</span>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setGuidanceOpen((o) => !o)}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">AI Guide</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setDocsOpen((o) => !o)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Five9 Docs</span>
              </Button>

              {organizations.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 max-w-[160px]">
                      <span className="truncate text-xs">{organization?.name}</span>
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
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

              <NotificationBell />
              <HealthIndicator status="healthy" />

              <button
                onClick={() => navigate("/admin/settings")}
                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/15"
                title={user?.email || ""}
              >
                {user?.email?.slice(0, 2).toUpperCase() || "U"}
              </button>
            </div>
          </div>
        </header>

        {/* Sticky horizontal sub-nav */}
        {activeSection?.subNav && <SectionTabs items={activeSection.subNav} />}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Right rails */}
      <GuidancePanel open={guidanceOpen} onClose={() => setGuidanceOpen(false)} />
      <Five9DocsPanel open={docsOpen} onClose={() => setDocsOpen(false)} />

      <ScrollToTopButton />
      <AssistantButton />
    </div>
  );
}
