import {
  LayoutDashboard, Building, Plug, FileText, Bell, Settings, CreditCard,
  Home, Users, Megaphone, BookOpen, FormInput, FileStack, PlayCircle,
  UserCog, Headphones, ClipboardCheck, BarChart3, Brain, Sparkles,
} from "lucide-react";

export type SubNavItem = {
  label: string;
  href: string;
  permission?: string | null;
};

export type SectionDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  permission?: string | null;
  /** sub-nav rendered as horizontal tabs inside this section */
  subNav?: SubNavItem[];
  /** path prefixes that count as "inside" this section for active-state */
  matches?: string[];
};

/**
 * Org-level primary nav — canonical seven (Phase 1, master spec).
 * De-surfaced in this pass: Clients, Five9 (now under Integrations), Flows, Deployments, Runs, Templates.
 * Their routes remain reachable via direct URL or redirect.
 */
export const GLOBAL_SECTIONS: SectionDef[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: "/admin",
    permission: null,
    matches: ["/admin", "/admin/dashboard", "/admin/agent-dashboard"],
  },
  {
    key: "workspaces",
    label: "Workspaces",
    icon: Building,
    href: "/admin/workspaces",
    permission: null,
    matches: ["/admin/workspaces", "/admin/clients", "/admin/tenants"],
  },
  {
    key: "connectors",
    label: "Connectors",
    icon: Plug,
    href: "/admin/connectors",
    permission: "integrations",
    matches: [
      "/admin/connectors", "/admin/integrations", "/admin/legal-connect",
      // Phase D: /admin/five9 de-surfaced — silent redirect to /admin/connectors/five9.
      "/admin/mappings", "/admin/domains",
    ],
    subNav: [
      { label: "Catalog", href: "/admin/connectors" },
      { label: "Mappings", href: "/admin/mappings" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    href: "/admin/reports",
    permission: null,
    matches: ["/admin/reports", "/admin/qa", "/admin/logs"],
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    href: "/admin/notifications",
    permission: null,
    matches: ["/admin/notifications"],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    permission: "settings",
    matches: ["/admin/settings"],
  },
  {
    key: "billing",
    label: "Billing",
    icon: CreditCard,
    href: "/admin/billing",
    permission: null,
    matches: ["/admin/billing"],
  },
];

/**
 * Workspace-level secondary nav — canonical 13 (Phase 2 target).
 * Exported for /outline rendering only; NOT yet wired into AdminShell.
 * Hrefs point at the eventual /app/workspaces/:workspaceId/* routes.
 */
export type WorkspaceNavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  /** When false the section route is mounted/reachable but de-surfaced from
   *  workspace nav, home cards and shell secondary tabs (compatibility-only). */
  surfaced?: boolean;
};

/**
 * Canonical workspace registry. Surfaced=false entries remain reachable via
 * direct URL but are hidden from primary nav, home cards and tabs per the
 * canonical route map. Do NOT remove entries — route mounting still depends
 * on these keys; toggle `surfaced` instead.
 */
export const WORKSPACE_SECTIONS: WorkspaceNavItem[] = [
  { key: "home", label: "Home", icon: Home, href: "home", surfaced: true },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, href: "campaigns", surfaced: true },
  { key: "guides", label: "Guides", icon: BookOpen, href: "guides", surfaced: true },
  { key: "forms", label: "Forms", icon: FormInput, href: "forms", surfaced: true },
  { key: "templates", label: "Templates", icon: FileStack, href: "templates", surfaced: true },
  { key: "clients", label: "Clients", icon: Users, href: "clients", surfaced: true },
  { key: "runs", label: "Runs", icon: PlayCircle, href: "runs", surfaced: false },
  { key: "agents", label: "Agents", icon: UserCog, href: "agents", surfaced: false },
  { key: "supervisor", label: "Supervisor", icon: Headphones, href: "supervisor", surfaced: false },
  { key: "qa", label: "QA", icon: ClipboardCheck, href: "qa", surfaced: true },
  { key: "analytics", label: "Analytics", icon: BarChart3, href: "analytics", surfaced: true },
  { key: "integrations", label: "Integrations", icon: Plug, href: "integrations", surfaced: true },
  { key: "knowledge", label: "Knowledge", icon: Brain, href: "knowledge", surfaced: false },
  { key: "assistant", label: "Assistant", icon: Sparkles, href: "assistant", surfaced: false },
  { key: "settings", label: "Settings", icon: Settings, href: "settings", surfaced: true },
];

/** Subset shown in primary workspace surfaces (nav, home cards, secondary tabs). */
export const SURFACED_WORKSPACE_SECTIONS: WorkspaceNavItem[] =
  WORKSPACE_SECTIONS.filter((s) => s.surfaced !== false);

export function findActiveSection(pathname: string): SectionDef | null {
  for (const s of GLOBAL_SECTIONS) {
    if (s.href === pathname) return s;
  }
  let best: SectionDef | null = null;
  let bestLen = 0;
  for (const s of GLOBAL_SECTIONS) {
    for (const m of s.matches ?? [s.href]) {
      if ((pathname === m || pathname.startsWith(m + "/")) && m.length > bestLen) {
        best = s;
        bestLen = m.length;
      }
    }
  }
  return best;
}
