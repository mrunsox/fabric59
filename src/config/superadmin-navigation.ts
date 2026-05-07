import { LayoutDashboard, Archive, Download, Route, BookOpen, Building2, Users, FileText, Phone, Sparkles, BarChart3, ClipboardCheck } from "lucide-react";

export type SuperadminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const SUPERADMIN_SECTIONS: SuperadminNavItem[] = [
  { key: "overview", label: "Overview", href: "/superadmin", icon: LayoutDashboard },
  { key: "workspaces", label: "Workspaces", href: "/superadmin/workspaces", icon: Building2 },
  { key: "users", label: "Users", href: "/superadmin/users", icon: Users },
  { key: "design-partners", label: "Design Partners", href: "/superadmin/design-partners", icon: Sparkles },
  { key: "legal-connect-reports", label: "Legal Connect Reports", href: "/superadmin/legal-connect-reports", icon: BarChart3 },
  { key: "vault", label: "Feature Vault", href: "/superadmin/vault", icon: Archive },
  { key: "exports", label: "Source Exports", href: "/superadmin/exports", icon: Download },
  { key: "routes", label: "Advanced Routes", href: "/superadmin/routes", icon: Route },
  { key: "docs", label: "System Docs", href: "/superadmin/docs", icon: BookOpen },
  { key: "call-flow", label: "Call Flow", href: "/superadmin/call-flow", icon: Phone },
  { key: "dev-guide", label: "Dev Guide", href: "/superadmin/dev-guide", icon: FileText },
  { key: "test-cases", label: "Test cases", href: "/superadmin/test-cases", icon: ClipboardCheck },
];
