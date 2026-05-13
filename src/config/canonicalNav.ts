import {
  LayoutDashboard, Building, Plug, FileText, Bell, Settings, CreditCard,
  Home, Users, Megaphone, BookOpen, FormInput, FileStack,
  ClipboardCheck, BarChart3, Brain, Sparkles,
  Sparkle, UserSquare2, Tag, Boxes, Heart, Shield,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Phase 0 — Canonical nav registry.
 *
 * Single source of truth for the new shells:
 * - 7-item Org nav  (/org/*)
 * - 12-item Workspace nav (/w/:workspaceId/*)
 * - 6-item Marketing nav (public)
 *
 * Legacy navigation.ts (GLOBAL_SECTIONS / WORKSPACE_SECTIONS) remains in place
 * during the additive Phase 0 mount. It will be removed in the cutover phase.
 */

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Path relative to the shell's prefix (no leading slash). */
  to: string;
};

/** Canonical Org nav — 7 items. Prefix: /org */
export const ORG_NAV: NavItem[] = [
  { key: "overview",      label: "Overview",      icon: LayoutDashboard, to: "" },
  { key: "workspaces",    label: "Workspaces",    icon: Building,        to: "workspaces" },
  { key: "connectors",    label: "Connectors",    icon: Plug,            to: "connectors" },
  { key: "reports",       label: "Reports",       icon: FileText,        to: "reports" },
  { key: "notifications", label: "Notifications", icon: Bell,            to: "notifications" },
  { key: "settings",      label: "Settings",      icon: Settings,        to: "settings" },
  { key: "billing",       label: "Billing",       icon: CreditCard,      to: "billing" },
];

/** Canonical Workspace nav — 12 items. Prefix: /w/:workspaceId */
export const WORKSPACE_NAV: NavItem[] = [
  { key: "home",         label: "Home",         icon: Home,            to: "home" },
  { key: "clients",      label: "Clients",      icon: Users,           to: "clients" },
  { key: "campaigns",    label: "Campaigns",    icon: Megaphone,       to: "campaigns" },
  { key: "guides",       label: "Guides",       icon: BookOpen,        to: "guides" },
  { key: "forms",        label: "Forms",        icon: FormInput,       to: "forms" },
  { key: "templates",    label: "Templates",    icon: FileStack,       to: "templates" },
  { key: "qa",           label: "QA",           icon: ClipboardCheck,  to: "qa" },
  { key: "analytics",    label: "Analytics",    icon: BarChart3,       to: "analytics" },
  { key: "integrations", label: "Integrations", icon: Plug,            to: "integrations" },
  { key: "knowledge",    label: "Knowledge",    icon: Brain,           to: "knowledge" },
  { key: "assistant",    label: "Assistant",    icon: Sparkles,        to: "assistant" },
  { key: "settings",     label: "Settings",     icon: Settings,        to: "settings" },
];

/** Canonical Marketing nav — 6 items. Public, no auth. */
export const MARKETING_NAV: NavItem[] = [
  { key: "solutions",    label: "Solutions",    icon: Sparkle,        to: "/solutions" },
  { key: "personas",     label: "Personas",     icon: UserSquare2,    to: "/personas" },
  { key: "pricing",      label: "Pricing",      icon: Tag,            to: "/pricing" },
  { key: "integrations", label: "Integrations", icon: Boxes,          to: "/integrations" },
  { key: "customers",    label: "Customers",    icon: Heart,          to: "/customers" },
  { key: "trust",        label: "Trust",        icon: Shield,         to: "/trust" },
];
