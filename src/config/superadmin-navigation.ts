import { LayoutDashboard, BookOpen, Building2, Users, Sparkles, BarChart3 } from "lucide-react";

export type SuperadminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Canonical surfaced superadmin nav — platform-governance only.
 *
 * De-surfaced (still mounted, reachable via direct URL):
 *   - /superadmin/routes                      (debug route dump)
 *   - /superadmin/dev-guide                   (internal dev reference)
 *   - /superadmin/test-cases                  (internal QA matrix)
 *   - /superadmin/call-flow/raw               (legacy)
 *
 * Retired in Phase 1 Fabric59 reposition (now tombstone to /superadmin/docs):
 *   - /superadmin/vault, /superadmin/vault/:id, /superadmin/exports
 */
export const SUPERADMIN_SECTIONS: SuperadminNavItem[] = [
  { key: "overview", label: "Overview", href: "/superadmin", icon: LayoutDashboard },
  { key: "workspaces", label: "Organizations", href: "/superadmin/workspaces", icon: Building2 },
  { key: "users", label: "Users", href: "/superadmin/users", icon: Users },
  { key: "design-partners", label: "Design Partners", href: "/superadmin/design-partners", icon: Sparkles },
  { key: "legal-connect-reports", label: "Legal Connect Reports", href: "/superadmin/legal-connect-reports", icon: BarChart3 },
  { key: "docs", label: "System Docs", href: "/superadmin/docs", icon: BookOpen },
];
