import {
  LayoutDashboard, Building, Plug, FileText, Bell, Settings, CreditCard,
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
 * Workspace-level nav lives in `src/config/canonicalNav.ts` (`WORKSPACE_NAV`,
 * `WORKSPACE_NAV_GROUPS`, `WORKSPACE_NAV_PINNED`, `WORKSPACE_NAV_DEMOTED`).
 * The legacy workspace-sections export and its `surfaced` field were
 * removed in the Phase 1 Pass-2B cleanup. Import canonical nav from
 * `@/config/canonicalNav` instead.
 */




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
