import {
  LayoutDashboard, Building2, Phone, Scale, Megaphone, Users,
  Zap, FlaskConical, Activity, BookOpen, Settings,
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
    subNav: [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Build Outline", href: "/outline" },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    icon: Building2,
    href: "/admin",
    permission: "tenants",
    matches: ["/admin", "/admin/clients", "/admin/partners"],
    subNav: [
      { label: "All Clients", href: "/admin" },
      { label: "Partners", href: "/admin/partners" },
    ],
  },
  {
    key: "five9",
    label: "Five9",
    icon: Phone,
    href: "/admin/domains",
    permission: "domains",
    matches: [
      "/admin/domains", "/admin/five9", "/admin/campaigns",
      "/admin/dispositions", "/admin/campaign-blueprints",
      "/admin/abandon-rate", "/admin/callback-queue", "/admin/ani-blocklist",
    ],
    subNav: [
      { label: "Domains", href: "/admin/domains" },
      { label: "Campaign Builder", href: "/admin/five9/campaign-builder" },
      { label: "Campaigns", href: "/admin/campaigns" },
      { label: "Dispositions", href: "/admin/dispositions" },
      { label: "Blueprints", href: "/admin/campaign-blueprints" },
    ],
  },
  {
    key: "legal-connect",
    label: "Legal Connect",
    icon: Scale,
    href: "/admin/legal-connect",
    permission: "integrations",
    matches: ["/admin/legal-connect", "/admin/integrations", "/admin/mappings"],
    subNav: [
      { label: "Overview", href: "/admin/legal-connect" },
      { label: "Integrations", href: "/admin/integrations" },
      { label: "Field Mappings", href: "/admin/mappings" },
    ],
  },
  {
    key: "campaigns",
    label: "Campaigns",
    icon: Megaphone,
    href: "/admin/campaigns",
    permission: "domains",
    matches: ["/admin/scriptflow", "/admin/scripts", "/admin/script-routing", "/admin/call-flow", "/admin/tree-editor", "/admin/qr-routing"],
    subNav: [
      { label: "Active", href: "/admin/campaigns" },
      { label: "Archived", href: "/admin/campaigns/archived" },
      { label: "ScriptFlow", href: "/admin/scriptflow" },
      { label: "Call Flow", href: "/admin/call-flow" },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    icon: Users,
    href: "/admin/agents",
    permission: "agents",
    matches: ["/admin/agents", "/admin/agent-dashboard", "/admin/supervisor", "/admin/qa", "/admin/goals", "/admin/training", "/admin/scripter"],
    subNav: [
      { label: "Roster", href: "/admin/agents" },
      { label: "Supervisor", href: "/admin/supervisor" },
      { label: "QA", href: "/admin/qa" },
      { label: "Goals", href: "/admin/goals" },
      { label: "Training", href: "/admin/training" },
    ],
  },
  {
    key: "automations",
    label: "Automations",
    icon: Zap,
    href: "/admin/automations",
    permission: "domains",
    matches: ["/admin/automations", "/admin/email-templates", "/admin/summary-templates", "/admin/ani-blocklist", "/admin/callback-queue", "/admin/abandon-rate"],
    subNav: [
      { label: "Post-Call", href: "/admin/automations" },
      { label: "Email Templates", href: "/admin/email-templates" },
      { label: "Summary Templates", href: "/admin/summary-templates" },
      { label: "ANI Block List", href: "/admin/ani-blocklist" },
      { label: "Callback Queue", href: "/admin/callback-queue" },
      { label: "Abandon Rate", href: "/admin/abandon-rate" },
    ],
  },
  {
    key: "testing",
    label: "Testing",
    icon: FlaskConical,
    href: "/admin/test",
    permission: "test_console",
    matches: ["/admin/test"],
    subNav: [
      { label: "Test Console", href: "/admin/test" },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoring",
    icon: Activity,
    href: "/admin/logs",
    permission: "logs",
    matches: ["/admin/logs", "/admin/notifications", "/admin/data-plane", "/admin/identity", "/admin/feedback", "/admin/reports", "/admin/billing"],
    subNav: [
      { label: "API Logs", href: "/admin/logs" },
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Reports", href: "/admin/reports" },
      { label: "Billing", href: "/admin/billing" },
      { label: "Data Plane", href: "/admin/data-plane" },
      { label: "Identity", href: "/admin/identity" },
      { label: "Feedback", href: "/admin/feedback" },
    ],
  },
  {
    key: "docs",
    label: "Docs",
    icon: BookOpen,
    href: "/admin/kb",
    permission: null,
    matches: ["/admin/kb"],
    subNav: [
      { label: "Knowledge Base", href: "/admin/kb" },
      { label: "Build Outline", href: "/outline" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    permission: "settings",
    matches: ["/admin/settings", "/admin/utilities", "/admin/design-system"],
    subNav: [
      { label: "Workspace", href: "/admin/settings" },
      { label: "Utilities", href: "/admin/utilities" },
      { label: "Design System", href: "/admin/design-system" },
    ],
  },
];

export function findActiveSection(pathname: string): SectionDef | null {
  // exact match first
  for (const s of GLOBAL_SECTIONS) {
    if (s.href === pathname) return s;
  }
  // prefix match using `matches`
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
