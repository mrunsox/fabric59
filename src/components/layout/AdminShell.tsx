import { useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { AssistantButton } from "@/components/assistant/AssistantButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GLOBAL_SECTIONS, findActiveSection } from "@/config/navigation";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { Five9DocsPanel } from "@/components/docs/Five9DocsPanel";
import { GuidancePanel } from "@/components/assistant/GuidancePanel";
import { OrgRail } from "@/shells/OrgRail";

/**
 * AdminShell — Supabase-style two-tier nav (converged).
 * Org-level rail (OrgRail) + main column. No secondary sidebar at /admin/*;
 * org sections live in the rail itself. The workspace-level secondary sidebar
 * only appears when the user enters /w/:workspaceId/* via WorkspaceShell.
 */
export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, organizations, switchOrganization, user } = useAuth();
  const [docsOpen, setDocsOpen] = useState(false);
  const [guidanceOpen, setGuidanceOpen] = useState(false);

  const activeSection = findActiveSection(location.pathname);
  // GLOBAL_SECTIONS is consumed by OrgRail — referenced here just to surface
  // unused-import linting & keep the public API stable.
  void GLOBAL_SECTIONS;

  return (
    <div className="min-h-screen bg-background flex w-full">
      <OrgRail />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border/40">
          <div className="mx-auto max-w-[1440px] h-full px-8 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-muted-foreground/70 truncate">
                {organization?.name || "Organization"}
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
                <span className="hidden sm:inline">Assistant</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setDocsOpen((o) => !o)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Docs</span>
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

        {activeSection?.subNav && <SectionTabs items={activeSection.subNav} />}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <GuidancePanel open={guidanceOpen} onClose={() => setGuidanceOpen(false)} />
      <Five9DocsPanel open={docsOpen} onClose={() => setDocsOpen(false)} />

      <ScrollToTopButton />
      <AssistantButton />
    </div>
  );
}
