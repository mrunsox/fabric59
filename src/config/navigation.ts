import {
  LayoutDashboard, Building, Building2, Phone, Plug, Workflow,
  Rocket, Activity, FileStack, Settings,
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

export const GLOBAL_SECTIONS: SectionDef[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    permission: null,
    matches: ["/admin/dashboard"],
  },
  {
    key: "workspaces",
    label: "Workspaces",
    icon: Building,
    href: "/admin/workspaces",
    permission: null,
    matches: ["/admin/workspaces"],
  },
  {
    key: "clients",
    label: "Clients",
    icon: Building2,
    href: "/admin",
    permission: "tenants",
    matches: ["/admin", "/admin/clients"],
  },
  {
    key: "five9",
    label: "Five9",
    icon: Phone,
    href: "/admin/five9",
    permission: "domains",
    matches: [
      "/admin/five9", "/admin/domains", "/admin/campaigns",
      "/admin/dispositions", "/admin/campaign-blueprints",
    ],
    subNav: [
      { label: "Overview", href: "/admin/five9" },
      { label: "Domains", href: "/admin/domains" },
      { label: "Campaign Builder", href: "/admin/five9/campaign-builder" },
      { label: "Campaigns", href: "/admin/campaigns" },
      { label: "Dispositions", href: "/admin/dispositions" },
    ],
  },
  {
    key: "connectors",
    label: "Connectors",
    icon: Plug,
    href: "/admin/connectors",
    permission: "integrations",
    matches: ["/admin/connectors", "/admin/legal-connect", "/admin/integrations", "/admin/mappings"],
  },
  {
    key: "flows",
    label: "Flows",
    icon: Workflow,
    href: "/admin/flows",
    permission: null,
    matches: ["/admin/flows"],
  },
  {
    key: "deployments",
    label: "Deployments",
    icon: Rocket,
    href: "/admin/deployments",
    permission: null,
    matches: ["/admin/deployments"],
  },
  {
    key: "runs",
    label: "Runs",
    icon: Activity,
    href: "/admin/runs",
    permission: null,
    matches: ["/admin/runs", "/admin/logs", "/admin/monitoring"],
  },
  {
    key: "templates",
    label: "Templates",
    icon: FileStack,
    href: "/admin/templates",
    permission: null,
    matches: ["/admin/templates"],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    permission: "settings",
    matches: ["/admin/settings"],
  },
];

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
